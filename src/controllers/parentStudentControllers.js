const Student = require('../models/student')

exports.get_student_id = async (req, res) => {
    try {
        const students = await Student.find({ parentId: req.params.parentId })
        res.json(students)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


