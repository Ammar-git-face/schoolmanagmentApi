const mongoose = require('mongoose')

const ptaSchema = new mongoose.Schema({
    title: { type: String, required: true },
    agenda: { type: String },
    type: { type: String, enum: ['video', 'audio'], default: 'video' },
    date: { type: String },
    time: { type: String },
    schoolCode: { type: String, required: true, index: true } ,
    duration: { type: String },
    roomName: { type: String }, // unique Jitsi room name
    status: { type: String, enum: ['upcoming', 'completed'], default: 'upcoming' },
    allTeachers: { type: Boolean, default: false },
    allParents: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.models.PTA || mongoose.model('PTA', ptaSchema)