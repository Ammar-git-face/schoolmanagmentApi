const mongoose = require('mongoose')

const ptaschema = new mongoose.Schema({
    title: String,
    agenda: String,
    type: String, // 'audio' or 'video'
    time: String,
    date: String,
    duration: String,
    allTeachers: Boolean,
    allParents: Boolean,
}, { timestamps: true })

const Pta = mongoose.model('Pta', ptaschema)
module.exports = Pta;

