const mongoose = require('mongoose')

const teacherSchema = new mongoose.Schema({
    fullname: {
        type: String,
        require: true,
    },

    email: {
        type: String,
        require: true,
    },
    salary: {
        type: String,
        require: true,
    },
    paid: {
        type: String,
        require: true,
    },
    subject: {
        type: String,
        require: true,
    }
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema)

module.exports = Teacher;