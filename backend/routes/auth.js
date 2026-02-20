import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'scholarhunter_secret_key_2024';

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }
    
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      profileCompleted: false
    })
    
    const result = await newUser.save()
    
    const token = jwt.sign({ id: result._id, email: result.email }, SECRET, { expiresIn: '7d' })
    
    res.status(201).json({
      message: 'Registration successful',
      user: { id: result._id, email: result.email, name: result.name, profileCompleted: result.profileCompleted },
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Registration failed', error: error.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: '7d' })
    
    res.json({
      message: 'Login successful',
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        profileCompleted: user.profileCompleted 
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed', error: error.message })
  }
})

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' })
    }
    
    const decoded = jwt.verify(token, SECRET)
    const user = await User.findById(decoded.id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    res.json({ 
      id: user._id, 
      email: user.email, 
      name: user.name, 
      profileCompleted: user.profileCompleted 
    })
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired token' })
  }
})

export default router
