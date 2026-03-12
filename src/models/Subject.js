const mongoose = require('mongoose')

const subjectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    className: { type: String, required: true },   // e.g. "JSS 1A" or "JSS 1" (covers all JSS 1)
    maxCA: { type: Number, default: 40 },
    maxExam: { type: Number, default: 60 },
    schoolCode: { type: String, required: true, index: true } ,
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

// No duplicate subject for same class
subjectSchema.index({ name: 1, className: 1 }, { unique: true })

module.exports = mongoose.models.Subject || mongoose.model('Subject', subjectSchema)