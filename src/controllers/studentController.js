const Student = require('../models/student')
const Parent  = require('../models/Parent')

// POST /student
const student_post = async (req, res) => {
    try {
        const { fullname, studentClass, parent, familyCode } = req.body

        let parentId = null
        if (familyCode) {
            const existingParent = await Parent.findOne({ familyCode, schoolCode: req.schoolCode })
            if (existingParent) parentId = existingParent._id
        }

        const student = new Student({
            fullname, studentClass, parent, familyCode,
            parentId,
            schoolCode: req.schoolCode   // ✅ attach schoolCode from token
        })

        const saved = await student.save()
        res.status(201).json(saved)
    } catch (err) {
        console.error('student_post error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// GET /student/getStudent — only this school's students
const student_get = async (req, res) => {
    try {
        const students = await Student.find({ schoolCode: req.schoolCode }).sort({ createdAt: -1 })
        res.status(200).json(students)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /student/:id
const class_update = async (req, res) => {
    try {
        const updated = await Student.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            req.body,
            { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// DELETE /student/:id
const student_delete = async (req, res) => {
    try {
        await Student.findOneAndDelete({ _id: req.params.id, schoolCode: req.schoolCode })
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /student/byParent/:parentId
const student_by_parent = async (req, res) => {
    try {
        const students = await Student.find({ parentId: req.params.parentId, schoolCode: req.schoolCode })
        res.json(students)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { student_get, student_post, student_delete, class_update, student_by_parent }