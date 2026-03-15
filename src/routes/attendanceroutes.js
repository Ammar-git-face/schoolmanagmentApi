const express = require('express')
const atnrouter = express.Router()
const {
    markAttendance,
    getClassAttendance,
    getStudentAttendance,
    getAllAttendance,
    getClassSummary
} = require('../controllers/AttendanceController')
const {attachSchool} = require('../middlewares/schoolMiddleware.js')

atnrouter.post('/mark', markAttendance , attachSchool)
atnrouter.get('/class/:className/:date', attachSchool, getClassAttendance)
atnrouter.get('/student/:studentId', attachSchool, getStudentAttendance)
atnrouter.get('/summary', attachSchool, getClassSummary)
atnrouter.get('/all',  attachSchool ,getAllAttendance)

module.exports = atnrouter