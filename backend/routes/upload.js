import express from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { parseResume } from '../utils/resumeParser.js'
import { authenticateToken } from '../middleware/auth.js'
import { Profile, User } from '../models/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// Ensure uploads directory exists
const uploadDir = join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * POST /api/upload/resume
 * Uploads and parses a resume
 */
router.post('/resume', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse the resume
    const parsedData = await parseResume(req.file.path);

    // Prepare profile update data
    const profileData = {
      resumePath: req.file.path,
      fieldOfStudy: parsedData.fieldOfStudy || [],
      targetCountries: parsedData.country ? [parsedData.country] : [],
      skills: parsedData.skills || [],
      experience: parsedData.experience || [],
      updatedAt: new Date()
    };
    
    // Map parsed education level to education array if possible
    if (parsedData.educationLevel && parsedData.educationLevel !== "Bachelor's") {
        // Only add if we have something specific, otherwise keep it clean or let user fill it
        // For now, we'll leave education array management to manual entry or refinement
    }

    // Update or create profile
    await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { 
        $set: profileData,
        $setOnInsert: { 
            education: [], 
            experience: [], 
            skills: [] 
        } 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // Mark profile as partially completed (or fully if we trust the parser)
    // For now, just track that they have a resume
    await User.findByIdAndUpdate(req.user.id, { 
        $set: { updatedAt: new Date() } 
    });

    res.json({
      message: 'Resume uploaded and parsed successfully',
      filePath: req.file.path,
      fileName: req.file.filename,
      parsedData: {
        educationLevel: parsedData.educationLevel,
        fieldOfStudy: parsedData.fieldOfStudy,
        country: parsedData.country,
        skills: parsedData.skills,
        experience: parsedData.experience,
        confidence: parsedData.confidence,
        preview: parsedData.text.slice(0, 500) + '...'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    // Cleanup file if error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message || 'Error processing resume' });
  }
});

/**
 * POST /api/upload/manual-resume
 * Manual resume data entry endpoint
 */
router.post('/manual-resume', authenticateToken, async (req, res) => {
  try {
    const {
      educationLevel,
      fieldOfStudy,
      country,
      skills = [],
      experience = [],
      education = []
    } = req.body;

    // Validate required fields
    if (!educationLevel || !fieldOfStudy || !country) {
      return res.status(400).json({
        message: 'Missing required fields: educationLevel, fieldOfStudy, and country are required'
      });
    }

    // Validate field types
    if (!Array.isArray(fieldOfStudy)) {
      return res.status(400).json({
        message: 'fieldOfStudy must be an array'
      });
    }

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        message: 'skills must be an array'
      });
    }

    // Sanitize input to prevent XSS
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(/[<>]/g, '');
    };

    const sanitizedData = {
      educationLevel: sanitizeString(educationLevel),
      fieldOfStudy: fieldOfStudy.map(sanitizeString),
      country: sanitizeString(country),
      skills: skills.map(sanitizeString),
      experience: experience.map(exp => ({
        ...exp,
        company: sanitizeString(exp.company),
        position: sanitizeString(exp.position),
        description: sanitizeString(exp.description)
      })),
      education: education.map(edu => ({
        ...edu,
        degree: sanitizeString(edu.degree),
        field: sanitizeString(edu.field),
        school: sanitizeString(edu.school)
      }))
    };

    // Calculate confidence score based on data completeness
    let confidence = 60; // Base confidence for manual entry
    if (skills.length > 0) confidence += 10;
    if (experience.length > 0) confidence += 15;
    if (education.length > 1) confidence += 15;
    confidence = Math.min(confidence, 100);

    // SAVE TO DATABASE: Update or create user profile
    const profileData = {
      education: sanitizedData.education.map(edu => ({
        degree: edu.degree,
        field: edu.field,
        school: edu.school,
        graduationYear: edu.graduationYear
      })),
      fieldOfStudy: sanitizedData.fieldOfStudy,
      targetCountries: [sanitizedData.country], // Map single country to array
      skills: sanitizedData.skills,
      experience: sanitizedData.experience,
      updatedAt: new Date()
    };

    // Find and update existing profile or create new one using Mongoose upsert
    await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: profileData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // Update user profile completion status
    await User.findByIdAndUpdate(req.user.id, {
      $set: { profileCompleted: true, updatedAt: new Date() }
    });
    
    res.json({
      message: 'Manual resume data processed and saved successfully',
      parsedData: {
        educationLevel: sanitizedData.educationLevel,
        fieldOfStudy: sanitizedData.fieldOfStudy,
        country: sanitizedData.country,
        skills: sanitizedData.skills,
        experience: sanitizedData.experience,
        education: sanitizedData.education,
        confidence,
        source: 'manual'
      }
    });

  } catch (error) {
    console.error('Manual resume processing error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      body: req.body
    });
    
    res.status(500).json({
      message: 'Error processing manual resume data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;
