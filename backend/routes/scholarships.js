import express from 'express'
import { Scholarship, Profile } from '../models/index.js'
import { authenticateToken } from '../middleware/auth.js'
import { calculateMatchScore } from '../utils/matching.js'

const router = express.Router()

router.get('/match', authenticateToken, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    
    // If no profile, return generic recommendations or empty
    if (!profile) {
      return res.json([]); 
    }

    // Adapt profile for matching function
    // Assuming education array is sorted desc or we pick the highest
    // For now, let's take the first one or default
    const educationLevel = profile.education && profile.education.length > 0 
      ? profile.education[0].degree || "Bachelor's" 
      : "Bachelor's";

    const userProfile = {
      educationLevel: educationLevel,
      fieldOfStudy: profile.fieldOfStudy || [],
      country: profile.targetCountries && profile.targetCountries.length > 0 ? profile.targetCountries[0] : 'International'
    };

    const scholarships = await Scholarship.find({});
    
    const matched = scholarships.map(sch => {
      const { totalScore, breakdown } = calculateMatchScore(userProfile, sch.toObject());
      return { ...sch.toObject(), matchScore: totalScore, matchBreakdown: breakdown };
    });

    // Filter by score > 40 (loose match)
    const relevant = matched.filter(m => m.matchScore >= 40);
    
    // Sort by score desc
    relevant.sort((a, b) => b.matchScore - a.matchScore);

    res.json(relevant.slice(0, 20));
  } catch (error) {
    console.error('Matching error:', error);
    res.status(500).json({ message: 'Matching failed', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { 
      countries, 
      fields, 
      excludeIELTS, 
      excludeAppFee, 
      deadline,
      sortBy,
      gpaMinimum,
      page = 1,
      limit = 20,
      search 
    } = req.query
    
    const query = {}
    
    if (countries) {
      const countryList = countries.split(',').map(c => c.trim())
      query.country = { $in: countryList }
    }
    
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim())
      query.fieldOfStudy = { $in: fieldList }
    }
    
    if (excludeIELTS === 'true') {
      query.ieltsRequired = false
    }
    
    if (excludeAppFee === 'true') {
      query.applicationFee = 0
    }
    
    if (gpaMinimum) {
      query.minGPA = { $gte: parseFloat(gpaMinimum) }
    }
    
    if (deadline && deadline !== 'all') {
      const today = new Date()
      let futureDate = new Date()
      
      if (deadline === 'upcoming') {
        futureDate.setDate(today.getDate() + 30)
      } else if (deadline === '60days') {
        futureDate.setDate(today.getDate() + 60)
      } else if (deadline === '90days') {
        futureDate.setDate(today.getDate() + 90)
      }
      
      query.deadline = { $gte: today, $lte: futureDate }
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { university: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    
    let sortOption = {}
    if (sortBy === 'deadline') {
      sortOption = { deadline: 1 }
    } else if (sortBy === 'recent') {
      sortOption = { createdAt: -1 }
    } else if (sortBy === 'funding') {
      sortOption = { amount: -1 }
    } else {
      sortOption = { deadline: 1 }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const scholarships = await Scholarship.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
    
    const total = await Scholarship.countDocuments(query)
    
    res.json({
      scholarships,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scholarships', error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const scholarship = await Scholarship.findOne({ id: req.params.id })
    
    if (!scholarship) {
      return res.status(404).json({ message: 'Scholarship not found' })
    }
    
    res.json(scholarship)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scholarship', error: error.message })
  }
})

router.get('/countries/list', async (req, res) => {
  try {
    const countries = await Scholarship.distinct('country')
    res.json(countries)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch countries', error: error.message })
  }
})

router.get('/fields/list', async (req, res) => {
  try {
    const fields = await Scholarship.distinct('fieldOfStudy')
    res.json(fields)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fields', error: error.message })
  }
})

export default router
