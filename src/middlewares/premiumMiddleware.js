// src/middlewares/premiumMiddleware.js
// ✅ Blocks access to premium-only features for free-tier schools
// Add after attachSchool on routes that require premium plan

const Owner = require('../models/Owner')

const requirePremium = async (req, res, next) => {
    try {
        const schoolCode = req.schoolCode
        if (!schoolCode) return res.status(401).json({ error: 'School not identified' })

        const owner = await Owner.findOne({ schoolCode }, 'plan isActive').lean()

        if (!owner) return res.status(404).json({ error: 'School not found' })
        if (owner.isActive === false) return res.status(403).json({ error: 'School account is deactivated' })

        // ✅ Allow premium schools through
        if (owner.plan === 'premium') return next()

        // ✅ Also allow during free trial (plan === 'trial')
        if (owner.plan === 'trial') return next()

        // ❌ Free plan — block access
        return res.status(403).json({
            error: 'This feature is only available on the Premium plan.',
            code: 'PREMIUM_REQUIRED',
            upgradeMessage: 'Upgrade your school to the Premium plan to access messaging, PTA meetings, and payment transactions.'
        })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { requirePremium }