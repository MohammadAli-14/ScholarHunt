import fs from 'fs'
import path from 'path'
import os from 'os'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize AI clients lazily
let openai = null;
let gemini = null;

function getAIClients() {
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch (e) {
      console.error('Failed to initialize OpenAI client:', e.message);
    }
  }
  
  if (!gemini && process.env.GEMINI_API_KEY) {
    try {
      gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      console.log('Gemini client initialized successfully with key length:', process.env.GEMINI_API_KEY.length);
    } catch (e) {
      console.error('Failed to initialize Gemini client:', e.message);
    }
  }
  
  return { openai, gemini };
}

/**
 * Enhanced Resume Parser
 * - Supports PDF and DOCX
 * - Uses LLM for intelligent extraction if available (OpenAI or Gemini)
 * - Falls back to regex-based extraction
 * - Provides confidence scores
 */
async function parseResume(input) {
  try {
    // Check if input is a Buffer or file path
    const isBuffer = Buffer.isBuffer(input);
    let fileExt = '.pdf';
    let dataBuffer;
    
    if (isBuffer) {
      // Input is a Buffer (from base64 decode)
      dataBuffer = input;
      // Assume PDF for buffer input (from /api/users/upload-resume endpoint)
      fileExt = '.pdf';
    } else {
      // Input is a file path (from multer upload)
      const filePath = input;
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      fileExt = path.extname(filePath).toLowerCase();
      dataBuffer = fs.readFileSync(filePath);
    }

    let text = '';

    // Step 1: Extract text based on file type
    if (fileExt === '.pdf') {
      try {
        // Use pdf-parse correctly - it's a function, not a class
        const data = await pdfParse(dataBuffer);
        text = data.text;
        
        if (!text || text.trim().length === 0) {
          throw new Error('PDF file appears to be empty or contains no extractable text');
        }
      } catch (pdfError) {
        throw new Error(`PDF parsing failed: ${pdfError.message}`);
      }
    } else if (fileExt === '.docx' || fileExt === '.doc') {
      try {
        // For DOCX, we need to write buffer to temp file or use the original path
        let result;
        if (isBuffer) {
          // Write buffer to temp file for mammoth
          const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}.docx`);
          fs.writeFileSync(tempPath, dataBuffer);
          result = await mammoth.extractRawText({ path: tempPath });
          fs.unlinkSync(tempPath);
        } else {
          result = await mammoth.extractRawText({ path: input });
        }
        text = result.value;
        
        if (!text || text.trim().length === 0) {
          throw new Error('DOCX file appears to be empty or contains no extractable text');
        }
      } catch (docError) {
        throw new Error(`DOCX parsing failed: ${docError.message}`);
      }
    } else {
      throw new Error('Unsupported file format. Please upload PDF or DOCX.');
    }

    // Clean text
    text = text.replace(/\s+/g, ' ').trim();

    // Step 2: Intelligent Extraction
    let extractedData = {
      educationLevel: null,
      fieldOfStudy: [],
      country: null,
      skills: [],
      experience: [],
      confidence: 0
    };

    const { openai, gemini } = getAIClients();

    // Strategy: Gemini -> OpenAI -> Regex
    // Or if configured, OpenAI -> Gemini -> Regex
    
    const PREFER_OPENAI = process.env.PREFER_OPENAI === 'true';
    let extractionSuccess = false;

    // Helper functions for clearer logic
    const tryOpenAI = async () => {
        if (!openai) return null;
        try {
            console.log('Attempting OpenAI parsing...');
            return await extractWithOpenAI(text, openai);
        } catch (e) {
            console.warn('OpenAI parsing failed:', e.message);
            return null;
        }
    };

    const tryGemini = async () => {
        if (!gemini) return null;
        try {
            console.log('Attempting Gemini parsing...');
            return await extractWithGemini(text, gemini);
        } catch (e) {
            console.warn('Gemini parsing failed:', e.message);
            return null;
        }
    };

    // Execution Logic
    if (PREFER_OPENAI) {
        // Try OpenAI first
        const openAIResult = await tryOpenAI();
        if (openAIResult) {
            extractedData = openAIResult;
            extractionSuccess = true;
        } else {
            // Fallback to Gemini
            const geminiResult = await tryGemini();
            if (geminiResult) {
                extractedData = geminiResult;
                extractionSuccess = true;
            }
        }
    } else {
        // Try Gemini first (Default)
        const geminiResult = await tryGemini();
        if (geminiResult) {
            extractedData = geminiResult;
            extractionSuccess = true;
        } else {
            // Fallback to OpenAI
            const openAIResult = await tryOpenAI();
            if (openAIResult) {
                extractedData = openAIResult;
                extractionSuccess = true;
            }
        }
    }

    // Final fallback to Regex
     if (!extractionSuccess) {
       console.log('All AI services failed or unavailable, using regex parser');
      // Debug log to help troubleshooting
      console.log('Environment variables available:', {
        GEMINI_KEY_EXISTS: !!process.env.GEMINI_API_KEY,
        OPENAI_KEY_EXISTS: !!process.env.OPENAI_API_KEY,
        PREFER_OPENAI: process.env.PREFER_OPENAI,
        NODE_ENV: process.env.NODE_ENV
      });
      extractedData = extractWithRegex(text);
    }

    return {
      text: text.slice(0, 2000), // Return preview of text
      ...extractedData
    };

  } catch (error) {
    // Enhanced error logging with context
    console.error('Resume parsing error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Return user-friendly error messages
    if (error.message.includes('Unsupported file format')) {
      throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
    } else if (error.message.includes('File not found')) {
      throw new Error('The uploaded file could not be found. Please try uploading again.');
    } else if (error.message.includes('empty') || error.message.includes('no extractable text')) {
      throw new Error('The file appears to be empty or contains no readable text. Please upload a valid resume.');
    } else if (error.message.includes('PDF parsing failed')) {
      throw new Error('Failed to parse PDF file. The file may be corrupted or password-protected.');
    } else if (error.message.includes('DOCX parsing failed')) {
      throw new Error('Failed to parse DOCX file. The file may be corrupted or in an unsupported format.');
    }
    
    // Generic error for unexpected issues - return fallback data instead of throwing
    console.warn('Resume parsing failed, returning fallback data:', error.message);
    return {
      text: '',
      educationLevel: "Bachelor's",
      fieldOfStudy: ['General'],
      country: 'International',
      skills: [],
      experience: [],
      confidence: 30,
      _fallback: true
    };
  }
}

async function extractWithGemini(text, geminiClient) {
  // List of models to try in order of preference/availability
  const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest", "gemini-pro"];
  
  let lastError = null;
  
  for (const modelName of modelsToTry) {
    try {
        console.log(`Attempting resume parsing with model: ${modelName}`);
        const model = geminiClient.getGenerativeModel({ model: modelName });
        const prompt = `
    You are an expert resume parser. Extract the following information from the resume text below:
    1. Education History (List of degrees/qualifications) - For each, extract:
       - Institution Name (University/College/School)
       - Degree (e.g., Bachelor's, Master's, PhD, High School Diploma)
       - Field of Study (Major/Discipline)
       - Graduation Year (YYYY format, e.g., 2025). If currently studying, estimate based on "Expected" or "Present" dates.
       - GPA (e.g., 3.5/4.0, 8.5/10). If not found, leave as null.
    2. Highest Education Level (High School, Bachelor's, Master's, PhD, Post-Doc)
    3. Field of Study (Academic discipline, e.g., Computer Science, Biology) - List top 1-2.
    4. Country of Citizenship/Residency (Full English Name, e.g., United States, India, Nigeria). Infer from address or university location if not explicit.
    5. Skills (List of technical and soft skills found in the text)
    6. Experience (List of work experience with company name, position, duration, and short description)
    
    Return ONLY a VALID JSON object with the following keys: 
    "education" (array of objects with keys: institution, degree, field, graduationYear, gpa),
    "educationLevel", 
    "fieldOfStudy" (array of strings), 
    "country" (string), 
    "skills" (array of strings), 
    "experience" (array of objects with keys: company, position, duration, description),
    "confidence" (0-100 integer based on clarity).
    
    Do not include markdown formatting (like \`\`\`json). Just the raw JSON string.
    
    Resume Text:
    ${text.slice(0, 10000)}
    `;
  
    const result = await model.generateContent(prompt);
      const response = await result.response;
      let textResponse = response.text();
      
      // Clean up potential markdown code blocks
      textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
          const parsed = JSON.parse(textResponse);
          return {
              education: Array.isArray(parsed.education) ? parsed.education : [],
              educationLevel: parsed.educationLevel || "Bachelor's",
              fieldOfStudy: Array.isArray(parsed.fieldOfStudy) ? parsed.fieldOfStudy : [parsed.fieldOfStudy || 'General'],
              country: parsed.country || 'International',
              skills: Array.isArray(parsed.skills) ? parsed.skills : [],
              experience: Array.isArray(parsed.experience) ? parsed.experience : [],
              confidence: parsed.confidence || 70
          };
      } catch (e) {
          console.error("Failed to parse Gemini JSON response:", textResponse);
          throw new Error("Invalid JSON response from Gemini");
      }
    } catch (error) {
      console.warn(`Gemini model ${modelName} failed:`, error.message.split('[')[0]);
      lastError = error;
      // Continue to next model
    }
  }

  // If all models fail
  console.error("All Gemini models failed. Last error:", lastError);
  throw lastError;
}

async function extractWithOpenAI(text, openaiClient) {
  const prompt = `
    You are an expert resume parser. Extract the following information from the resume text below:
    1. Education History (List of degrees/qualifications) - For each, extract:
       - Institution Name (University/College/School)
       - Degree (e.g., Bachelor's, Master's, PhD, High School Diploma)
       - Field of Study (Major/Discipline)
       - Graduation Year (YYYY format, e.g., 2025). If currently studying, estimate based on "Expected" or "Present" dates.
       - GPA (e.g., 3.5/4.0, 8.5/10). If not found, leave as null.
    2. Highest Education Level (High School, Bachelor's, Master's, PhD, Post-Doc)
    3. Field of Study (Academic discipline, e.g., Computer Science, Biology) - List top 1-2.
    4. Country of Citizenship/Residency (Full English Name, e.g., United States, India, Nigeria). Infer from address or university location if not explicit.
    5. Skills (List of technical and soft skills found in the text)
    6. Experience (List of work experience with company name, position, duration, and short description)
    
    Return ONLY a VALID JSON object with the following keys: 
    "education" (array of objects with keys: institution, degree, field, graduationYear, gpa),
    "educationLevel", 
    "fieldOfStudy" (array of strings), 
    "country" (string), 
    "skills" (array of strings), 
    "experience" (array of objects with keys: company, position, duration, description),
    "confidence" (0-100 integer based on clarity).
    
    Resume Text:
    ${text.slice(0, 10000)}
  `;

  try {
      // Use gpt-4o-mini as it is cheaper and faster than gpt-3.5-turbo, or fallback to gpt-3.5-turbo
      const model = "gpt-4o-mini"; 
      
      const completion = await openaiClient.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return {
        education: Array.isArray(result.education) ? result.education : [],
        educationLevel: result.educationLevel || "Bachelor's",
        fieldOfStudy: Array.isArray(result.fieldOfStudy) ? result.fieldOfStudy : [result.fieldOfStudy || 'General'],
        country: result.country || 'International',
        confidence: result.confidence || 70,
        skills: Array.isArray(result.skills) ? result.skills : [],
        experience: Array.isArray(result.experience) ? result.experience : []
      };
  } catch (error) {
      console.error("OpenAI API error:", error);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini is not available
      if (error.code === 'model_not_found') {
        try {
                    console.log("gpt-4o-mini not found, falling back to gpt-3.5-turbo");
                    const completion = await openaiClient.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model: "gpt-3.5-turbo",
                        response_format: { type: "json_object" },
                        temperature: 0.1,
                    });
                    const result = JSON.parse(completion.choices[0].message.content);
                    return {
                        education: Array.isArray(result.education) ? result.education : [],
                        educationLevel: result.educationLevel || "Bachelor's",
                        fieldOfStudy: Array.isArray(result.fieldOfStudy) ? result.fieldOfStudy : [result.fieldOfStudy || 'General'],
                        country: result.country || 'International',
                        confidence: result.confidence || 70,
                        skills: Array.isArray(result.skills) ? result.skills : [],
                        experience: Array.isArray(result.experience) ? result.experience : []
                    };
        } catch (retryError) {
             console.error("OpenAI fallback error:", retryError);
             throw retryError;
        }
      }
      throw error;
  }
}

function extractWithRegex(text) {
  const textLower = text.toLowerCase();
  
  // 1. Education Level
  let educationLevel = "Bachelor's"; // Default
  if (textLower.match(/ph\.?d|doctorate|doctor of/)) educationLevel = "PhD";
  else if (textLower.match(/master|m\.?s\.?c|m\.?a\.|m\.?b\.?a/)) educationLevel = "Master's";
  else if (textLower.match(/bachelor|b\.?s\.?c|b\.?a\.|b\.?eng/)) educationLevel = "Bachelor's";
  else if (textLower.match(/high school|secondary school/)) educationLevel = "High School";

  // 2. Field of Study
  const fields = [];
  const fieldKeywords = {
    'Computer Science': ['computer science', 'software', 'programming', 'development', 'software engineering', 'information systems', 'information technology', 'cybersecurity', 'cloud computing'],
    'Engineering': ['engineering', 'electrical', 'mechanical', 'civil', 'chemical', 'biomedical', 'environmental'],
    'Data Science': ['data science', 'data analytics', 'big data', 'machine learning', 'artificial intelligence', 'ai'],
    'Business': ['business', 'management', 'finance', 'marketing', 'mba', 'economics', 'accounting'],
    'Medicine': ['medicine', 'medical', 'health', 'nursing', 'pharmacy', 'public health'],
    'Science': ['physics', 'chemistry', 'biology', 'science', 'mathematics', 'statistics'],
    'Arts': ['arts', 'history', 'literature', 'english', 'sociology', 'psychology', 'philosophy'],
    'Law': ['law', 'legal', 'criminology']
  };

  for (const [field, keywords] of Object.entries(fieldKeywords)) {
    if (keywords.some(k => textLower.includes(k))) {
      fields.push(field);
    }
  }

  // 3. Country (Simple heuristic based on common country names)
  const countries = {
    'USA': ['united states', 'usa', 'u.s.a', 'new york', 'california', 'texas', 'florida', 'washington', 'chicago'],
    'UK': ['united kingdom', 'uk', 'london', 'england', 'scotland', 'wales', 'manchester', 'birmingham'],
    'Canada': ['canada', 'toronto', 'vancouver', 'montreal', 'ontario', 'quebec'],
    'Australia': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth'],
    'India': ['india', 'delhi', 'mumbai', 'bangalore', 'hyderabad', 'chennai', 'pune', 'kolkata'],
    'Nigeria': ['nigeria', 'lagos', 'abuja', 'kano', 'ibadan'],
    'Pakistan': ['pakistan', 'lahore', 'karachi', 'islamabad', 'faisalabad'],
    'China': ['china', 'beijing', 'shanghai', 'shenzhen', 'guangzhou'],
    'Germany': ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt'],
    'Netherlands': ['netherlands', 'amsterdam', 'rotterdam', 'utrecht'],
    'France': ['france', 'paris', 'lyon', 'marseille'],
    'Sweden': ['sweden', 'stockholm', 'gothenburg'],
    'Switzerland': ['switzerland', 'zurich', 'geneva', 'basel'],
    'Japan': ['japan', 'tokyo', 'osaka', 'kyoto'],
    'Singapore': ['singapore'],
    'New Zealand': ['new zealand', 'auckland', 'wellington'],
    'Ireland': ['ireland', 'dublin', 'cork'],
    'Denmark': ['denmark', 'copenhagen'],
    'Norway': ['norway', 'oslo'],
    'Finland': ['finland', 'helsinki'],
    'Austria': ['austria', 'vienna'],
    'Belgium': ['belgium', 'brussels', 'antwerp'],
    'Italy': ['italy', 'rome', 'milan', 'naples'],
    'Spain': ['spain', 'madrid', 'barcelona', 'seville']
  };

  let country = 'International';
  for (const [code, keywords] of Object.entries(countries)) {
    if (keywords.some(k => textLower.includes(k))) {
      country = code;
      break; 
    }
  }

  // 4. Skills extraction
  const commonSkills = [
    'javascript', 'python', 'java', 'c++', 'react', 'node.js', 'angular', 'vue', 
    'html', 'css', 'sql', 'nosql', 'mongodb', 'aws', 'docker', 'kubernetes',
    'git', 'agile', 'scrum', 'communication', 'leadership', 'problem solving',
    'project management', 'data analysis', 'machine learning', 'ai', 'devops'
  ];
  
  const skills = [];
  commonSkills.forEach(skill => {
    if (textLower.includes(skill)) {
      skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });

  // 5. Experience (Basic Heuristic)
  // Look for lines with years like "2018 - 2020" or "Present"
  const experience = [];
  const experienceRegex = /(\d{4})\s*[-–]\s*(present|\d{4})/gi;
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (experienceRegex.test(lines[i])) {
      // Assume this line or previous line has company/role
      // This is very rough but better than nothing
      let company = "Unknown Company";
      let position = "Unknown Position";
      
      // Try to find text in the same line or adjacent lines
      const cleanLine = lines[i].replace(experienceRegex, '').trim();
      if (cleanLine.length > 3) {
         company = cleanLine;
      } else if (i > 0 && lines[i-1].trim().length > 3) {
         company = lines[i-1].trim();
      }
      
      experience.push({
        company: company.substring(0, 50),
        position: position,
        duration: lines[i].match(experienceRegex)[0],
        description: "Extracted from resume"
      });
      
      if (experience.length >= 3) break; // Limit to 3 entries
    }
  }

  // Calculate confidence
  let confidence = 50;
  if (educationLevel !== "Bachelor's") confidence += 10;
  if (fields.length > 0) confidence += 20;
  if (country !== 'International') confidence += 10;
  if (skills.length > 0) confidence += 10;

  return {
    educationLevel,
    fieldOfStudy: fields.length > 0 ? fields.slice(0, 2) : ['General'],
    country,
    skills,
    experience,
    confidence
  };
}

export { parseResume, extractWithOpenAI, extractWithGemini };
export default parseResume;
