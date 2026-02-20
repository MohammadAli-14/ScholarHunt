import express from 'express'
import jwt from 'jsonwebtoken'
import { User, Profile, SavedScholarship } from '../models/index.js'

const router = express.Router()
const SECRET = process.env.JWT_SECRET || 'scholarhunter_secret_key_2024'

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }
  
  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { education, experience, skills, targetCountries, fieldOfStudy, gpa, englishLevel, name, phone } = req.body
    
    const profileData = {
      userId: userId,
      education: education || [],
      experience: experience || [],
      skills: skills || [],
      targetCountries: targetCountries || [],
      fieldOfStudy: fieldOfStudy || [],
      gpa: gpa || 0,
      englishLevel: englishLevel || 'intermediate',
      updatedAt: new Date()
    }
    
    // Upsert profile
    await Profile.findOneAndUpdate(
      { userId },
      { $set: profileData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    
    await User.findByIdAndUpdate(
      userId,
      { $set: { profileCompleted: true, name, phone, updatedAt: new Date() } }
    )
    
    res.json({ message: 'Profile updated successfully', profileCompleted: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message })
  }
})

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    const user = await User.findById(userId).select('-password')
    const profile = await Profile.findOne({ userId })
    
    res.json({ user, profile: profile || {} })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message })
  }
})

router.get('/saved-scholarships', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const saved = await SavedScholarship.find({ userId }).sort({ savedAt: -1 })
    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch saved scholarships', error: error.message })
  }
})

router.post('/saved-scholarships', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { scholarshipId, scholarship } = req.body
    
    const existing = await SavedScholarship.findOne({ userId, scholarshipId })
    if (existing) {
      return res.status(400).json({ message: 'Scholarship already saved' })
    }
    
    const saved = new SavedScholarship({
      userId,
      scholarshipId,
      scholarship,
      status: 'saved',
      savedAt: new Date()
    })
    
    await saved.save()
    
    res.status(201).json({ message: 'Scholarship saved successfully', saved })
  } catch (error) {
    res.status(500).json({ message: 'Failed to save scholarship', error: error.message })
  }
})

router.delete('/saved-scholarships/:scholarshipId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const scholarshipId = req.params.scholarshipId
    
    await SavedScholarship.deleteOne({ userId, scholarshipId })
    
    res.json({ message: 'Scholarship removed from saved' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove scholarship', error: error.message })
  }
})

router.put('/saved-scholarships/:scholarshipId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const scholarshipId = req.params.scholarshipId
    const { status } = req.body
    
    const result = await SavedScholarship.findOneAndUpdate(
      { userId, scholarshipId },
      { $set: { status } },
      { new: true }
    )
    
    if (!result) {
      return res.status(404).json({ message: 'Saved scholarship not found' })
    }
    
    res.json({ message: 'Status updated', saved: result })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status', error: error.message })
  }
})

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    const savedCount = await SavedScholarship.countDocuments({ userId })
    const appliedCount = await SavedScholarship.countDocuments({ userId, status: 'applied' })
    const acceptedCount = await SavedScholarship.countDocuments({ userId, status: 'accepted' })
    const rejectedCount = await SavedScholarship.countDocuments({ userId, status: 'rejected' })
    
    const profile = await Profile.findOne({ userId })
    const profileCompleted = profile && profile.fieldOfStudy && profile.fieldOfStudy.length > 0
    
    res.json({
      savedCount,
      appliedCount,
      acceptedCount,
      rejectedCount,
      successRate: appliedCount > 0 ? Math.round((acceptedCount / appliedCount) * 100) : 0,
      profileCompleted: profileCompleted || false
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message })
  }
})

export default router
