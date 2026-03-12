const mongoose = require('mongoose');
const alertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
    },
    schoolCode: { type: String, required: true, index: true } ,
    to: {
        type: String,
        enum: ["All", "Parent", "Teachers"], // match your frontend
        required: true
    }
}, { timestamps: true })

const Alert = mongoose.model('alert', alertSchema);
module.exports = Alert;