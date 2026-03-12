const mongoose = require('mongoose')

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    schoolCode: {
        type: String,
        required: true,
        index: true
    },
    teacher: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true
        // ✅ No enum restriction — admin can use any grade name
    }
}, { timestamps: true })

const Addclass = mongoose.model('Class', classSchema)
module.exports = Addclass