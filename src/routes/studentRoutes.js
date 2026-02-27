const express = require('express')
const router = express.Router()
const studentControllers = require('../controllers/studentController')

router.post('/', studentControllers.student_post )

router.get('/getStudent', studentControllers.student_get)
//router.get('/getAll',studentControllers.get_student)
  

module.exports = router;