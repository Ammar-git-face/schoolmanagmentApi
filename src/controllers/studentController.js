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

// const get_student = async (req, res) => {
//     try {
//         const student = await Student.find();
//         const totalStudent = await Student.countDocuments()

//         res.status(201).json(totalStudent)
//     } catch (err) {
//         console.log(err)
//     }


// }
module.exports = { student_get, student_post  }
