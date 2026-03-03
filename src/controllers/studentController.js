const Student = require('../models/student')

const student_post = async (req, res) => {
    try {
        console.log("REQ BODY:", req.body);
        const student = new Student(req.body);
        const savedStudent = await student.save()

        res.status(201).json(savedStudent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}

const student_get = async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 })
        res.status(200).json(students)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const class_update = async (req, res) => {
    try {
        const { id } = req.params
        const updated = await Student.findByIdAndUpdate(id, req.body, { new: true })
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
  }

const student_delete = async (req, res) => {
    try {
        const { id } = req.params
        await Student.findByIdAndDelete(id)
        res.json({ message: "deleted sucessfully" })
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}

module.exports = { student_get, student_post, student_delete , class_update }
