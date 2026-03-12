// models/student.js
const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({
    fullname: String,
    studentClass: String,
    schoolCode: { type: String, required: true, index: true } ,
    parent: String,           // keep for display
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', default: null },
    familyCode: String       // add this
}, { timestamps: true })
module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema)

