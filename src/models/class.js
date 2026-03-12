const mongoose = require('mongoose')

const classSchema = new mongoose.Schema({
    name: {
        type:     String,
        required: true       // frontend sends this — e.g. "JSS 1A"
    },
    grade: {
        type:     String,
        required: true       // e.g. "JSS 1", "SS 2" — no enum restriction
    },
    schoolCode: {
        type:     String,
        required: true,
        index:    true
    },
    // teacher is NOT required — assigned separately via teacher page
    teacher: {
        type:    String,
        default: ''
    }
}, { timestamps: true })

const Addclass = mongoose.models.Class || mongoose.model('Class', classSchema)
module.exports = Addclass