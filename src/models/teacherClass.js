const mongoose = require('mongoose')

const teacherSchema = new mongoose.Schema({
    fullname: String,
    email: String,
    salary: Number,
    subject: String,
    paid: { type: String, default: 'unpaid' },
    assignedClasses: [
        {
          className: String,
          subject: String
        }
      ]
}, { timestamps: true })

const teacherClass = mongoose.model('TeacherClass', teacherSchema)

module.exports = teacherClass;



// ============ models/Salary.js ============
const mongoose = require('mongoose')

const salarySchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    teacherName: String,
    month: String,       // e.g "January 2024"
    amount: Number,
    status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
    schoolCode: { type: String, required: true, index: true } ,
    paidDate: Date,
}, { timestamps: true })

module.exports = mongoose.model('Salary', salarySchema)


// ============ routes/salaryRoutes.js ============
// const express = require('express')
// const router = express.Router()
// const Salary = require('../models/Salary')
// const Teacher = require('../models/Teachers')

// // Get salary history for a specific teacher
// router.get('/history/:teacherId', async (req, res) => {
//     try {
//         const history = await Salary.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 })
//         res.json(history)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// })

// // Get all salary records (admin view)
// router.get('/', async (req, res) => {
//     try {
//         const salaries = await Salary.find().sort({ createdAt: -1 })
//         res.json(salaries)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// })

// // Admin pays a teacher salary for a month
// router.post('/', async (req, res) => {
//     try {
//         const { teacherId, month, amount } = req.body
//         const salary = await Salary.create({
//             teacherId,
//             month,
//             amount,
//             status: 'paid',
//             paidDate: new Date()
//         })
//         // also update teacher's paid status
//         await Teacher.findByIdAndUpdate(teacherId, { paid: 'paid' })
//         res.json(salary)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// })

// // Update salary status (admin marks as paid)
// router.put('/:id', async (req, res) => {
//     try {
//         const updated = await Salary.findByIdAndUpdate(
//             req.params.id,
//             { status: 'paid', paidDate: new Date() },
//             { new: true }
//         )
//         res.json(updated)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// })

// module.exports = router


// // ============ In your server.js add ============
// // const salaryRouter = require('./src/routes/salaryRoutes')
// // app.use('/salary', salaryRouter)