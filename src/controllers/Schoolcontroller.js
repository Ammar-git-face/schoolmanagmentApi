// =====================================================
// controllers/schoolController.js
// npm install uuid (already likely installed)
// =====================================================
const School = require("../models/school")
const Admin  = require("../models/admin")
const bcrypt = require("bcrypt")
const jwt    = require("jsonwebtoken")
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"

// ── POST /school/register ─────────────────────────────
// Creates school + first admin account in one step
exports.registerSchool = async (req, res) => {
    try {
        const { schoolName, schoolEmail, schoolPhone, schoolAddress,
                adminName, adminEmail, adminPassword } = req.body

        if (!schoolName || !schoolEmail || !adminName || !adminEmail || !adminPassword)
            return res.status(400).json({ error: "All fields are required" })

        // Check school email not taken
        const existing = await School.findOne({ email: schoolEmail })
        if (existing) return res.status(400).json({ error: "School already registered" })

        // Create school — schoolCode auto-generated
        const school = await School.create({
            name: schoolName,
            email: schoolEmail,
            phone: schoolPhone || "",
            address: schoolAddress || ""
        })

        // Create first admin for this school
        await Admin.create({
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            schoolCode: school.schoolCode
        })

        res.status(201).json({
            message: "School registered successfully",
            schoolCode: school.schoolCode,   // admin should save this — it's their login key
            schoolName: school.name
        })
    } catch (err) {
        console.error("registerSchool:", err.message)
        res.status(500).json({ error: err.message })
    }
}

// ── GET /school/info ──────────────────────────────────
// Returns school info — called after login to populate localStorage
exports.getSchoolInfo = async (req, res) => {
    try {
        const school = await School.findOne({ schoolCode: req.schoolCode }).lean()
        if (!school) return res.status(404).json({ error: "School not found" })
        res.json({
            name:       school.name,
            logo:       school.logo,
            email:      school.email,
            phone:      school.phone,
            address:    school.address,
            schoolCode: school.schoolCode
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── PUT /school/logo ──────────────────────────────────
// Admin uploads school logo (base64 string from frontend)
exports.uploadLogo = async (req, res) => {
    try {
        const { logo } = req.body  // base64 data URL: "data:image/png;base64,..."
        if (!logo) return res.status(400).json({ error: "No logo provided" })

        await School.findOneAndUpdate(
            { schoolCode: req.schoolCode },
            { logo },
            { new: true }
        )
        res.json({ message: "Logo updated successfully" })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── PUT /school/update ────────────────────────────────
// Admin updates school name, phone, address
exports.updateSchoolInfo = async (req, res) => {
    try {
        const { name, phone, address } = req.body
        const updated = await School.findOneAndUpdate(
            { schoolCode: req.schoolCode },
            { name, phone, address },
            { new: true }
        )
        res.json({ message: "School info updated", school: updated })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}