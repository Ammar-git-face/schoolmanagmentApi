const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    teacher: { // lowercase for consistency
        type: String,
        required: true
    },
    grade: {
        type: String,
        enum: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"], // match your frontend
        required: true
    }
}, { timestamps: true });

const Addclass = mongoose.model("Class", classSchema);
module.exports = Addclass;