// =====================================================
// controllers/superAdminController.js  — NEW
// Handles the super admin (platform owner) dashboard
// =====================================================
const Owner = require('../models/Owner')

// ── GET /superadmin/stats ─────────────────────────
exports.getDashboardStats = async (req, res) => {
    try {
        const owners = await Owner.find().sort({ createdAt: -1 }).lean()

        const totalSchools   = owners.length
        const freeSchools    = owners.filter(o => o.plan === 'free').length
        const basicSchools   = owners.filter(o => o.plan === 'basic').length
        const premiumSchools = owners.filter(o => o.plan === 'premium').length
        const activeSchools  = owners.filter(o => o.isActive !== false).length

        // Recent 10 registrations
        const recentRegistrations = owners.slice(0, 10).map(o => ({
            _id: o._id,
            schoolName: o.schoolName,
            ownerName:  o.fullname,
            email:      o.email,
            phone:      o.phone,
            plan:       o.plan,
            isActive:   o.isActive !== false,
            schoolCode: o.schoolCode,
            createdAt:  o.createdAt
        }))

        // Monthly registrations — last 6 months
        const monthlyData = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setDate(1)
            d.setMonth(d.getMonth() - i)
            const start = new Date(d.getFullYear(), d.getMonth(), 1)
            const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1)
            const count = owners.filter(o => {
                const c = new Date(o.createdAt)
                return c >= start && c < end
            }).length
            monthlyData.push({ month: d.toLocaleString('en-NG', { month: 'short' }), schools: count })
        }

        res.json({
            totalSchools, freeSchools, basicSchools, premiumSchools,
            activeSchools, recentRegistrations, monthlyData
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── GET /superadmin/schools ───────────────────────
exports.getAllSchools = async (req, res) => {
    try {
        const owners = await Owner.find().sort({ createdAt: -1 }).lean()
        res.json(owners)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── PUT /superadmin/toggle/:id ────────────────────
exports.toggleSchoolStatus = async (req, res) => {
    try {
        const owner = await Owner.findById(req.params.id)
        if (!owner) return res.status(404).json({ error: 'School not found' })
        owner.isActive = !owner.isActive
        await owner.save()
        res.json({ message: `School ${owner.isActive ? 'activated' : 'deactivated'}`, isActive: owner.isActive })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── PUT /superadmin/plan/:id ──────────────────────
exports.updatePlan = async (req, res) => {
    try {
        const { plan } = req.body
        if (!['free', 'basic', 'premium'].includes(plan))
            return res.status(400).json({ error: 'Invalid plan' })
        const owner = await Owner.findByIdAndUpdate(req.params.id, { plan }, { new: true })
        if (!owner) return res.status(404).json({ error: 'School not found' })
        res.json({ message: 'Plan updated', plan: owner.plan })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── DELETE /superadmin/school/:id ─────────────────
exports.deleteSchool = async (req, res) => {
    try {
        await Owner.findByIdAndDelete(req.params.id)
        res.json({ message: 'School deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── POST /superadmin/login ────────────────────────
// Super admin credentials stored in .env — no DB record needed
exports.superAdminLogin = async (req, res) => {
    try {
        const jwt = require('jsonwebtoken')
        const { email, password } = req.body

        // ✅ .trim() strips any invisible whitespace dotenv might leave
        const SUPER_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').trim()
        const SUPER_PASS  = (process.env.SUPER_ADMIN_PASSWORD || '').trim()

        // Debug log — remove after confirming it works
        console.log('SuperAdmin env check — email set:', !!SUPER_EMAIL, '| pass set:', !!SUPER_PASS)

        if (!SUPER_EMAIL || !SUPER_PASS) {
            return res.status(500).json({ error: 'Super admin credentials not configured in .env' })
        }

        // ✅ Strip any stray quotes the frontend might send
        const cleanPassword = password.replace(/['"]/g, '').trim()
        const cleanEmail    = email.replace(/['"]/g, '').trim()
        if (cleanEmail !== SUPER_EMAIL || cleanPassword !== SUPER_PASS) {
            return res.status(401).json({ error: 'Invalid super admin credentials' })
        }

        const token = jwt.sign(
            { role: 'superadmin', email },
            process.env.JWT_SECRET || 'mySuperSecretKey123',  // ✅ unified secret
            { expiresIn: '7d' }
        )

        res.cookie('superAdminToken', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        })

        res.json({ token, role: 'superadmin', email })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}