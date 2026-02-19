import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import OpenAI from 'openai'

// Initialize OpenAI if key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

/**
 * Enhanced Resume Parser
 * - Supports PDF and DOCX
 * - Uses LLM for intelligent extraction if available
 * - Falls back to regex-based extraction
 * - Provides confidence scores
 */
async function parseResume(filePath) {
  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileExt = path.extname(filePath).toLowerCase();
    let text = '';

    // Step 1: Extract text based on file type
    if (fileExt === '.pdf') {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        // Use pdf-parse correctly by creating a PDFParse instance with Uint8Array
        const parser = new pdfParse.PDFParse({ data: new Uint8Array(dataBuffer) });
        const data = await parser.getText();
        text = data.text;
        
        if (!text || text.trim().length === 0) {
          throw new Error('PDF file appears to be empty or contains no extractable text');
        }
      } catch (pdfError) {
        throw new Error(`PDF parsing failed: ${pdfError.message}`);
      }
    } else if (fileExt === '.docx' || fileExt === '.doc') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
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
      confidence: 0
    };

    if (openai) {
      try {
        extractedData = await extractWithLLM(text);
      } catch (llmError) {
        console.warn('LLM parsing failed, falling back to regex:', llmError.message);
        extractedData = extractWithRegex(text);
      }
    } else {
      console.log('No OpenAI API key found, using regex parser');
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
      filePath: filePath,
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
      confidence: 30,
      _fallback: true
    };
  }
}

async function extractWithLLM(text) {
  const prompt = `
    You are an expert resume parser. Extract the following information from the resume text below:
    1. Highest Education Level (High School, Bachelor's, Master's, PhD, Post-Doc)
    2. Field of Study (Academic discipline, e.g., Computer Science, Biology) - List top 1-2.
    3. Country of Citizenship/Residency (ISO 3166-1 alpha-2 code, e.g., US, IN, NG). Infer from address or university location if not explicit.
    
    Return ONLY a JSON object with keys: "educationLevel", "fieldOfStudy" (array), "country", "confidence" (0-100 integer based on clarity).
    
    Resume Text:
    ${text.slice(0, 3000)}
  `;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo-0125",
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const result = JSON.parse(completion.choices[0].message.content);
  return {
    educationLevel: result.educationLevel || 'Bachelor\'s',
    fieldOfStudy: Array.isArray(result.fieldOfStudy) ? result.fieldOfStudy : [result.fieldOfStudy],
    country: result.country || 'International',
    confidence: result.confidence || 70
  };
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
    'Computer Science': ['computer science', 'software', 'programming', 'development'],
    'Engineering': ['engineering', 'electrical', 'mechanical', 'civil'],
    'Business': ['business', 'management', 'finance', 'marketing', 'mba'],
    'Medicine': ['medicine', 'medical', 'health', 'nursing'],
    'Science': ['physics', 'chemistry', 'biology', 'science'],
    'Arts': ['arts', 'history', 'literature', 'english'],
    'Law': ['law', 'legal']
  };

  for (const [field, keywords] of Object.entries(fieldKeywords)) {
    if (keywords.some(k => textLower.includes(k))) {
      fields.push(field);
    }
  }

  // 3. Country (Simple heuristic based on common country names)
  const countries = {
    'US': ['united states', 'usa', 'u.s.a', 'new york', 'california', 'texas'],
    'UK': ['united kingdom', 'uk', 'london', 'england'],
    'CA': ['canada', 'toronto', 'vancouver'],
    'AU': ['australia', 'sydney', 'melbourne'],
    'IN': ['india', 'delhi', 'mumbai', 'bangalore'],
    'NG': ['nigeria', 'lagos', 'abuja'],
    'PK': ['pakistan', 'lahore', 'karachi', 'islamabad'],
    'CN': ['china', 'beijing', 'shanghai'],
    'DE': ['germany', 'berlin', 'munich']
  };

  let country = 'International';
  for (const [code, keywords] of Object.entries(countries)) {
    if (keywords.some(k => textLower.includes(k))) {
      country = code;
      break; 
    }
  }

  // Calculate confidence
  let confidence = 50;
  if (educationLevel !== "Bachelor's") confidence += 10;
  if (fields.length > 0) confidence += 20;
  if (country !== 'International') confidence += 10;

  return {
    educationLevel,
    fieldOfStudy: fields.length > 0 ? fields.slice(0, 2) : ['General'],
    country,
    confidence
  };
}

export { parseResume };
