const Teacher = require('../models/Teachers')

// POST /teacher — add teacher (schoolCode from token via attachSchool)
exports.teacher_post = async (req, res) => {
    try {
        const teacher = new Teacher({ ...req.body, schoolCode: req.schoolCode })
        const saved = await teacher.save()
        console.log('Teacher added:', saved.fullname)
        res.status(201).json(saved)
    } catch (err) {
        console.log('teacher_post error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// GET /teacher/getTeachers — only this school's teachers
exports.get_teacher = async (req, res) => {
    try {
        const teachers = await Teacher.find({ schoolCode: req.schoolCode }).sort({ createdAt: -1 })
        res.status(200).json(teachers)
    } catch (err) {
        console.log('get_teacher error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// GET /teacher/:id
exports.get_teacher_by_id = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ _id: req.params.id, schoolCode: req.schoolCode })
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// DELETE /teacher/:id
exports.teacher_delete = async (req, res) => {
    try {
        await Teacher.findOneAndDelete({ _id: req.params.id, schoolCode: req.schoolCode })
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


// PUT /teacher/:id
exports.teacher_update = async (req, res) => {
    try {
        const updated = await Teacher.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            req.body,
            { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /teacher/:id/assign-class
exports.assign_class = async (req, res) => {
    try {
        const { className, subject } = req.body
        if (!className || !subject)
            return res.status(400).json({ error: 'className and subject are required' })

        const teacher = await Teacher.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            { $push: { assignedClasses: { className, subject } } },
            { new: true }
        )
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /teacher/:id/remove-class
exports.remove_class = async (req, res) => {
    try {
        const { classId } = req.body
        if (!classId)
            return res.status(400).json({ error: 'classId is required' })

        const teacher = await Teacher.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            { $pull: { assignedClasses: { _id: classId } } },
            { new: true }
        )
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /teacher/dashboard-stats/:id
exports.teacher_dashboard_stats = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ _id: req.params.id, schoolCode: req.schoolCode })
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        const Student = require('../models/student')
        const classNames = (teacher.assignedClasses || []).map(c => c.className)
        const students = await Student.find({ studentClass: { $in: classNames }, schoolCode: req.schoolCode })

        res.json({
            myClasses: teacher.assignedClasses?.length || 0,
            totalStudents: students.length,
            monthlySalary: teacher.salary || 0,
            salaryStatus: teacher.paid || 'unpaid'
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}