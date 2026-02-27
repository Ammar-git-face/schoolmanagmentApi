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
// exports.getAll_get = async (req, res) => {
//     try {
//         const teacher = await Teacher.find()
//         const total = await Teacher.countDocuments()
//         res.status(201).json(total)
//     } catch (err) {
//         console.log(err)
//     }
// }