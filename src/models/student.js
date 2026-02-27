const mongoose = require('mongoose');
const Studentschema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },

    parent: {
        type: String,
        required: true
    },
    studentClass: {
        type: String,
        required: true
    },

} , { timestamps:true})

const Student = mongoose.model('Student', Studentschema);
module.exports = Student

