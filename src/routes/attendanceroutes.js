const express = require('express')
const atnrouter = express.Router()
const {
    markAttendance,
    getClassAttendance,
    getStudentAttendance,
    getAllAttendance,
    getClassSummary
} = require('../controllers/attendanceController')

atnrouter.post('/mark', markAttendance)
atnrouter.get('/class/:className/:date', getClassAttendance)
atnrouter.get('/student/:studentId', getStudentAttendance)
atnrouter.get('/summary', getClassSummary)
atnrouter.get('/all', getAllAttendance)

module.exports = atnrouter