const mongoose = require('mongoose')

const salarySchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    teacherName: String,
    month: String,       // e.g "January 2024"
    schoolCode: { type: String, required: true, index: true } ,
    amount: Number,
    status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
    paidDate: Date,
}, { timestamps: true })

// const TeacherSalary = mongoose.model('TeacherSalary', teacherSchema)

module.exports = mongoose.model('Salary', salarySchema)