const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const teacherSchema = new mongoose.Schema({
    fullname: String,
    email: { type: String, unique: true },
    password: { type: String, default: null },
    salary: Number,
    subject: String,
    // paid: { type: String, default: 'unpaid' },
    role: { type: String, default: 'teacher' },
    schoolCode: { type: String, required: true, index: true } ,
    accountNumber: { type: String, default: null },
    bankCode: { type: String, default: null },
    bankName: { type: String, default: null },
    salary: { type: Number, default: 0 },
    paid: { type: String, enum: ["paid", "unpaid", ""], default: "unpaid" },
    lastPaidAt: { type: Date, default: null },
    lastPaidAmount: { type: Number, default: 0 },
    assignedClasses: [{ className: String, subject: String }]
}, {
    timestamps: true,
    // No collection override — Mongoose default 'teachers' is correct
    // If your data is in 'Teacher', run this once in Mongo shell to migrate:
    // db.Teacher.find().forEach(doc => db.teachers.insertOne(doc))
})

teacherSchema.pre('save', async function () {
    if (!this.password || !this.isModified('password')) return
    this.password = await bcrypt.hash(this.password, 10)
})

module.exports = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema)

