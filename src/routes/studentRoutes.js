const express = require('express')
const router = express.Router()
const studentControllers = require('../controllers/studentController')

router.post('/', studentControllers.student_post )

router.get('/getStudent', studentControllers.student_get)
router.delete('/:id',studentControllers.student_delete)
router.put('/:id' , studentControllers.class_update)
  

module.exports = router;