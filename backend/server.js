import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import scholarshipData from './data/scholarships.js'
import { ScheduledScraper } from './utils/scheduledScraper.js'
import { Scholarship } from './models/index.js'
import uploadRoutes from './routes/upload.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import scholarshipRoutes from './routes/scholarships.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '.env') })

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI

// Verify environment variables
console.log('Environment check:')
console.log('- PORT:', PORT)
console.log('- MONGODB_URI exists:', !!MONGODB_URI)

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env file')
  process.exit(1)
}

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

let scheduledScraper = null

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('MongoDB connected successfully (Mongoose)')
    
    const count = await Scholarship.countDocuments()
    if (count === 0) {
      console.log('Seeding scholarships...')
      const seedDataWithSource = scholarshipData.map(s => ({
        ...s,
        source: 'manual',
        sourceUrl: s.applicationLink,
        lastScraped: new Date(),
        isActive: true,
        verified: true
      }))
      await Scholarship.insertMany(seedDataWithSource)
      console.log(`Seeded ${scholarshipData.length} scholarships`)
    } else {
      console.log(`Already ${count} scholarships`)
    }

    // Start scheduled scraper (runs every 24 hours)
    scheduledScraper = new ScheduledScraper(24)
    scheduledScraper.start()
    
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  }
}

connectDB()

app.get('/api/health', (req, res) => res.json({ status: 'ok', connected: mongoose.connection.readyState === 1 }))

// Mount Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/scholarships', scholarshipRoutes)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
