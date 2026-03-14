const express = require('express')
const rollrouter = express.Router()
const {
    generatePayroll,
    getPayroll,
    updatePayroll,
    payTeacher,
    markAsPaid,
    getOwnerStats,
    ownerLogin,
    ownerRegister
} = require('../controllers/Payrollcontroller')

rollrouter.post('/generate', generatePayroll)
rollrouter.get('/all', getPayroll)
rollrouter.put('/update/:id', updatePayroll)
rollrouter.post('/pay/:id', payTeacher)
rollrouter.put('/mark-paid/:id', markAsPaid)
rollrouter.get('/owner-stats', getOwnerStats)
rollrouter.post('/owner-login', ownerLogin)
rollrouter.post('/owner-register', ownerRegister)

module.exports = rollrouter