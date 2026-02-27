const express = require('express')
const router = express.Router()
const teacherControllers = require('../controllers/teacherControllers')

router.post('/', teacherControllers.teacher_post)
router.get('/getTeachers', teacherControllers.get_teacher)
//router.get('/getAll', teacherControllers.getAll_get)




module.exports = router;