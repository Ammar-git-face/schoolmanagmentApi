const Teacher = require('../models/Teachers')

// POST /teacher — admin creates a teacher
exports.teacher_post = async (req, res) => {
    try {
        // ✅ schoolCode comes from attachSchool middleware
        const teacher = new Teacher({ ...req.body, schoolCode: req.schoolCode })
        const saved = await teacher.save()
        res.status(201).json(saved)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /teacher/getTeachers — admin lists all teachers in school
exports.get_teacher = async (req, res) => {
    try {
        // ✅ Filter by schoolCode — don't leak other schools' teachers
        const teachers = await Teacher.find({ schoolCode: req.schoolCode })
            .select('-password')
        res.json(teachers)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /teacher/:id — teacher fetches own profile
exports.get_teacher_by_id = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            _id: req.params.id,
            schoolCode: req.schoolCode
        }).select('-password')
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
        ).select('-password')
        if (!updated) return res.status(404).json({ error: 'Teacher not found' })
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /teacher/:id/assign-class
exports.assign_class = async (req, res) => {
    try {
        const { className, subject } = req.body

        // step 1: find the teacher first
        const teacher = await Teacher.findOne({ _id: req.params.id })
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        // step 2: check for duplicate class
        const alreadyAssigned = teacher.assignedClasses.some(c => c.className === className)
        if (alreadyAssigned) return res.status(400).json({ error: 'Class already assigned' })

        // step 3: now push the new class
        teacher.assignedClasses.push({ className, subject })
        await teacher.save()

        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /teacher/:id/remove-class
exports.remove_class = async (req, res) => {
    try {
        const { className } = req.body
        const teacher = await Teacher.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            { $pull: { assignedClasses: { className } } },
            { new: true }
        ).select('-password')
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
        res.json(teacher)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /teacher/dashboard-stats/:id
exports.teacher_dashboard_stats = async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            _id: req.params.id,
            schoolCode: req.schoolCode
        })
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        const Student = require('../models/student')
        const classNames = (teacher.assignedClasses || []).map(c => c.className)
        const students = await Student.find({
            studentClass: { $in: classNames },
            schoolCode: req.schoolCode
        })

        res.json({
            myClasses: teacher.assignedClasses?.length || 0,
            totalStudents: students.length,
            monthlySalary: teacher.salary || 0,
            salaryStatus: teacher.paid || 'unpaid',
            assignedClasses: teacher.assignedClasses || []
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}