// src/middlewares/schoolMiddleware.js
const jwt   = require('jsonwebtoken')
const Owner = require('../models/Owner')

exports.attachSchool = async (req, res, next) => {
    try {
        // Read token from cookie OR Authorization header
        const token =
            req.cookies?.token ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.split(' ')[1]
                : null)

        if (!token) return res.status(401).json({ error: 'No token provided' })

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mySuperSecretKey123')

        if (!decoded.schoolCode)
            return res.status(401).json({ error: 'Token missing school information' })

        // ✅ Block deactivated schools
        const school = await Owner.findOne({ schoolCode: decoded.schoolCode }, 'isActive').lean()
        if (school && school.isActive === false)
            return res.status(403).json({ error: 'School account is deactivated. Contact support.' })

        req.schoolCode = decoded.schoolCode
        req.userId     = decoded.id
        req.userRole   = decoded.role
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' })
        if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' })
        res.status(500).json({ error: err.message })
    }
}