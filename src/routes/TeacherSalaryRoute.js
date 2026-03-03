const express = require('express')
const teacherSalaryrouter = express.Router()
const  teacherSalaryController = require('../controllers/teacherSalary')


teacherSalaryrouter.get('/history/:teacherId', teacherSalaryController.salary_getAll )
teacherSalaryrouter.get('/' , teacherSalaryController.salary_get)
teacherSalaryrouter.post('/', teacherSalaryController.salary_post)
teacherSalaryrouter.put('/:id', teacherSalaryController.salary_put)

module.exports = teacherSalaryrouter