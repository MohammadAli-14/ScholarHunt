import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { MongoClient, ObjectId } from 'mongodb'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import scholarshipData from './data/scholarships.js'
import { seedScholarships } from './data/seedScholarships.js'
import { parseResume } from './utils/resumeParser.js'
import { ScraperEngine, Scholars4DevScraper, OpportunityDeskScraper, WorldForumScraper, IEAFScraper, AfterSchoolAfricaScraper, normalizeScholarship, deduplicateScholarships } from './scrapers/index.js'
import { ScheduledScraper } from './utils/scheduledScraper.js'
import uploadRoutes from './routes/upload.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import scholarshipRoutes from './routes/scholarships.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 5000
const SECRET = process.env.JWT_SECRET || 'scholarhunter_secret_key_2024'
const MONGODB_URI = process.env.MONGODB_URI

// Verify environment variables
console.log('Environment check:')
console.log('- PORT:', PORT)
console.log('- MONGODB_URI exists:', !!MONGODB_URI)
console.log('- MONGODB_URI length:', MONGODB_URI ? MONGODB_URI.length : 0)

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env file')
  console.error('Please ensure your .env file contains: MONGODB_URI=mongodb+srv://...')
  process.exit(1)
}

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use('/api/upload', uploadRoutes)

let db = null
let scheduledScraper = null

async function connectDB() {
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not defined!')
    console.error('Current __dirname:', __dirname)
    console.error('process.env.MONGODB_URI:', process.env.MONGODB_URI)
    return
  }
  
  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    db = client.db()
    console.log('MongoDB connected successfully')
    
    const count = await db.collection('scholarships').countDocuments()
    if (count === 0) {
      console.log('Seeding scholarships...')
      // Add source fields to seed data
      const seedDataWithSource = scholarshipData.map(s => ({
        ...s,
        source: 'manual',
        sourceUrl: s.applicationLink,
        lastScraped: new Date(),
        isActive: true,
        verified: true
      }))
      await db.collection('scholarships').insertMany(seedDataWithSource)
      console.log(`Seeded ${scholarshipData.length} scholarships`)
    } else {
      console.log(`Already ${count} scholarships`)
    }

    // Start scheduled scraper (runs every 24 hours)
    scheduledScraper = new ScheduledScraper(db, 24)
    scheduledScraper.start()
    
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
  }
}

connectDB()

const requireDb = (req, res, next) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  next()
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(token, SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' })
  }
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', connected: db !== null }))

// AUTH
app.post('/api/auth/register', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { email, password, name } = req.body
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
    if (existing) return res.status(400).json({ message: 'Email already registered' })
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await db.collection('users').insertOne({ 
      email: email.toLowerCase(), password: hashedPassword, name,
      profileCompleted: false, createdAt: new Date()
    })
    const token = jwt.sign({ id: result.insertedId, email }, SECRET, { expiresIn: '7d' })
    res.status(201).json({ user: { id: result.insertedId, email: email.toLowerCase(), name, profileCompleted: false }, token })
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { email, password } = req.body
    const user = await db.collection('users').findOne({ email: email.toLowerCase() })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' })
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: '7d' })
    res.json({ user: { id: user._id, email: user.email, name: user.name, profileCompleted: user.profileCompleted }, token })
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

// SCHOLARSHIPS
app.get('/api/scholarships', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { countries, fields, excludeIELTS, excludeAppFee, deadline, sortBy, gpaMinimum, fundingType, page = 1, limit = 50 } = req.query
    const query = {}
    if (countries) query.country = { $in: countries.split(',') }
    if (fields) query.fieldOfStudy = { $in: fields.split(',') }
    if (excludeIELTS === 'true') query.ieltsRequired = false
    if (excludeAppFee === 'true') query.applicationFee = 0
    if (gpaMinimum) query.minGPA = { $gte: parseFloat(gpaMinimum) }
    if (fundingType && fundingType !== 'all') query.fundingType = fundingType === 'full' ? 'Full Scholarship' : 'Partial Scholarship'
    if (deadline && deadline !== 'all') {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + (deadline === 'upcoming' ? 30 : deadline === '60days' ? 60 : 90))
      query.deadline = { $gte: today, $lte: futureDate }
    }
    const sort = sortBy === 'recent' ? { createdAt: -1 } : { deadline: 1 }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const scholarships = await db.collection('scholarships').find(query).sort(sort).skip(skip).limit(parseInt(limit)).toArray()
    const total = await db.collection('scholarships').countDocuments(query)
    res.json({ scholarships, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scholarships' })
  }
})

app.get('/api/scholarships/countries/list', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const countries = await db.collection('scholarships').distinct('country')
    res.json(countries)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch countries' })
  }
})

app.get('/api/scholarships/fields/list', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const fields = await db.collection('scholarships').distinct('fieldOfStudy')
    res.json(fields)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fields' })
  }
})

app.get('/api/scholarships/:id', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const scholarship = await db.collection('scholarships').findOne({ id: req.params.id })
    if (!scholarship) return res.status(404).json({ message: 'Not found' })
    res.json(scholarship)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scholarship' })
  }
})

// USER PROFILE
app.put('/api/users/profile', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { education, experience, skills, targetCountries, fieldOfStudy, gpa, englishLevel, name, phone } = req.body
    const profileData = { userId: req.user.id, education, experience, skills, targetCountries, fieldOfStudy, gpa, englishLevel, updatedAt: new Date() }
    await db.collection('profiles').updateOne({ userId: req.user.id }, { $set: profileData }, { upsert: true })
    await db.collection('users').updateOne({ _id: req.user.id }, { $set: { name, phone, profileCompleted: true, updatedAt: new Date() } })
    res.json({ message: 'Profile updated', profileCompleted: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message })
  }
})

app.get('/api/users/profile', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const user = await db.collection('users').findOne({ _id: req.user.id }, { projection: { password: 0 } })
    const profile = await db.collection('profiles').findOne({ userId: req.user.id })
    res.json({ user, profile: profile || {} })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message })
  }
})

// UPLOAD RESUME - Parse PDF and extract data
app.post('/api/users/upload-resume', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  
  try {
    // Check if file was uploaded
    if (!req.body || !req.body.resumeData) {
      return res.status(400).json({ message: 'No resume data provided' })
    }
    
    // Decode base64 PDF data
    const base64Data = req.body.resumeData.replace(/^data:application\/pdf;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Parse the PDF
    const extractedData = await parseResume(buffer)
    
    res.json(extractedData)
  } catch (error) {
    console.error('Resume parsing error:', error)
    res.status(500).json({ message: 'Failed to parse resume', error: error.message })
  }
})

// SAVED SCHOLARSHIPS
app.get('/api/users/saved-scholarships', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const saved = await db.collection('saved_scholarships').find({ userId: req.user.id }).sort({ savedAt: -1 }).toArray()
    res.json(saved)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch saved scholarships' })
  }
})

app.post('/api/users/saved-scholarships', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { scholarshipId, scholarship } = req.body
    const existing = await db.collection('saved_scholarships').findOne({ userId: req.user.id, scholarshipId })
    if (existing) return res.status(400).json({ message: 'Already saved' })
    const saved = { userId: req.user.id, scholarshipId, scholarship, status: 'saved', savedAt: new Date() }
    await db.collection('saved_scholarships').insertOne(saved)
    res.status(201).json({ message: 'Saved', saved })
  } catch (error) {
    res.status(500).json({ message: 'Failed to save' })
  }
})

app.delete('/api/users/saved-scholarships/:scholarshipId', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    await db.collection('saved_scholarships').deleteOne({ userId: req.user.id, scholarshipId: req.params.scholarshipId })
    res.json({ message: 'Removed' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove' })
  }
})

app.put('/api/users/saved-scholarships/:scholarshipId', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { status } = req.body
    const result = await db.collection('saved_scholarships').findOneAndUpdate(
      { userId: req.user.id, scholarshipId: req.params.scholarshipId },
      { $set: { status } },
      { returnDocument: 'after' }
    )
    res.json({ message: 'Updated', saved: result })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update' })
  }
})

app.get('/api/users/stats', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const savedCount = await db.collection('saved_scholarships').countDocuments({ userId: req.user.id })
    const appliedCount = await db.collection('saved_scholarships').countDocuments({ userId: req.user.id, status: 'applied' })
    const acceptedCount = await db.collection('saved_scholarships').countDocuments({ userId: req.user.id, status: 'accepted' })
    const rejectedCount = await db.collection('saved_scholarships').countDocuments({ userId: req.user.id, status: 'rejected' })
    const profile = await db.collection('profiles').findOne({ userId: req.user.id })
    res.json({ savedCount, appliedCount, acceptedCount, rejectedCount, successRate: appliedCount > 0 ? Math.round((acceptedCount / appliedCount) * 100) : 0, profileCompleted: !!(profile && profile.fieldOfStudy && profile.fieldOfStudy.length) })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats' })
  }
})

// WEB SCRAPING ENDPOINTS
// Manual trigger for scraping (admin only - can be protected with additional middleware)
app.post('/api/admin/scrape-scholarships', authenticate, async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  
  try {
    const engine = new ScraperEngine()
    engine.register(new Scholars4DevScraper())
    engine.register(new OpportunityDeskScraper())
    
    console.log('Starting scholarship scraping...')
    const results = await engine.scrapeAll()
    
    // Collect all scholarships
    let allScholarships = []
    results.forEach(result => {
      if (result.scholarships && result.scholarships.length > 0) {
        allScholarships = allScholarships.concat(result.scholarships)
      }
    })
    
    // Normalize and deduplicate
    const normalized = allScholarships.map(s => normalizeScholarship(s))
    const unique = deduplicateScholarships(normalized)
    
    // Get existing IDs to avoid overwriting
    const existingIds = await db.collection('scholarships').distinct('id')
    const existingSet = new Set(existingIds)
    
    // Filter out existing ones and add new ones
    const newScholarships = unique.filter(s => !existingSet.has(s.id))
    
    if (newScholarships.length > 0) {
      await db.collection('scholarships').insertMany(newScholarships)
    }
    
    res.json({
      message: 'Scraping completed',
      totalFound: allScholarships.length,
      newAdded: newScholarships.length,
      sources: results.map(r => ({ source: r.source, count: r.count, error: r.error }))
    })
  } catch (error) {
    console.error('Scraping error:', error)
    res.status(500).json({ message: 'Scraping failed', error: error.message })
  }
})

// Get scraping status/sources
app.get('/api/scholarships/sources', async (req, res) => {
  try {
    const sources = [
      { name: 'scholars4dev', url: 'https://www.scholars4dev.com', status: 'active' },
      { name: 'opportunitydesk', url: 'https://opportunitydesk.org', status: 'active' },
      { name: 'manual', status: 'active' }
    ]
    
    // Get last scrape log
    const lastLog = await db.collection('scrape_logs').findOne({}, { sort: { timestamp: -1 } })
    
    res.json({
      sources,
      scheduledScraper: scheduledScraper ? scheduledScraper.getStatus() : null,
      lastScrape: lastLog,
      lastUpdated: new Date()
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sources', error: error.message })
  }
})

// Get scholarships by source
app.get('/api/scholarships/by-source/:source', async (req, res) => {
  if (!db) return res.status(503).json({ message: 'Database not ready' })
  try {
    const { source } = req.params
    const scholarships = await db.collection('scholarships')
      .find({ source })
      .sort({ lastScraped: -1 })
      .toArray()
    res.json({ scholarships, count: scholarships.length })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scholarships by source' })
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
