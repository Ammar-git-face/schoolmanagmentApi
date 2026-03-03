const Teacher = require('../models/Teachers');

exports.teacher_post = async (req, res) => {

    try {
        const teacher = new Teacher(req.body)
        const savedTeacher = await teacher.save()
        res.status(201).json(savedTeacher)

        console.log('teacher added')
        console.log(req.body)

    } catch (err) {
        console.log(err)
    }

}

exports.get_teacher = async (req, res) => {
    try {
        const teachers = await Teacher.find()
        res.status(201).json(teachers)
    } catch (err) {
        console.log(err)
        res.status(501).json({
            message: err.message
        })

    }


}

exports.teacher_delete = async (req, res) => {
    try {
        const { id } = req.params
        await Teacher.findByIdAndDelete(id) // assuming you're using Mongoose
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.teacher_update = async (req, res) => {
    try {
        const { id } = req.params
        const update = await Teacher.findByIdAndUpdate(id, req.body, { new: true })
        res.json(update)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
    }
}
// exports.getAll_get = async (req, res) => {
//     try {
//         const teacher = await Teacher.find()
//         const total = await Teacher.countDocuments()
//         res.status(201).json(total)
//     } catch (err) {
//         console.log(err)
//     }
// }