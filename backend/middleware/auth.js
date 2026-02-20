import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'scholarhunter_secret_key_2024'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  console.log('Auth check - Header:', authHeader ? 'Present' : 'Missing', 'Token:', token ? 'Present' : 'Missing')

  if (!token) {
    console.log('Auth failed: No token provided')
    return res.status(401).json({ message: 'Access token required' })
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      console.log('Auth failed: Token verification error -', err.message)
      return res.status(403).json({ message: 'Invalid or expired token' })
    }
    console.log('Auth success - User:', user.id)
    req.user = user
    next()
  })
}

export const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' })
}

export { SECRET }
