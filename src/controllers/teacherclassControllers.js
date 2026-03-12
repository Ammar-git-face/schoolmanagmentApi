const mongoose = require('mongoose')
const Teacher = require('../models/Teachers')

// then replace ALL Teacher with Teacher:
exports.teacher_put = async (req, res) => {
    try {
        const { classId } = req.body
        const teacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            { $pull: { assignedClasses: { _id: classId } } },
            { new: true }
        )
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.teacher_assign = async (req, res) => {
    try {
        const { className, subject } = req.body
        if (!mongoose.Types.ObjectId.isValid(req.params.id))
            return res.status(400).json({ error: "Invalid teacher ID" })
        if (!className || !subject)
            return res.status(400).json({ error: "className and subject are required" })

        const teacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            { $push: { assignedClasses: { className, subject } } },
            { new: true }
        )
        if (!teacher) return res.status(404).json({ error: "Teacher not found" })
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.teacher_get = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id)
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}
// Add to your teacherControllers.js



// Add to teacherRoutes.js — BEFORE /:id route:
// router.get("/dashboard-stats/:id", teacherControllers.teacher_dashboard_stats)