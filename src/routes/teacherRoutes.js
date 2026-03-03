const express = require('express')
const router = express.Router()
const teacherControllers = require('../controllers/teacherControllers')

router.post('/', teacherControllers.teacher_post)
router.get('/getTeachers', teacherControllers.get_teacher)
router.delete('/:id', teacherControllers.teacher_delete)
router.put('/:id' ,teacherControllers.teacher_update )




module.exports = router;