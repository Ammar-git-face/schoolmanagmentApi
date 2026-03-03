const mongoose = require('mongoose')

const resultSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName: String,
    subject: String,
    test: { type: Number, max: 20, default: 0 },
    note: { type: Number, max: 20, default: 0 },
    assignment: { type: Number, max: 10, default: 0 },
    exam: { type: Number, max: 50, default: 0 },
    total: { type: Number, default: 0 },
    grade: String,
    gpa: Number,
    term: { type: String, default: 'Term 1' },
    strengths: String,
    areasToImprove: String,
    comments: String,
}, { timestamps: true })

module.exports = mongoose.model('Result', resultSchema)