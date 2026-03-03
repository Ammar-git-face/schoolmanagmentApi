const express = require('express')
const teacherClassRouter = express.Router()

const teacherClassControllers = require('../controllers/teacherclassControllers')


teacherClassRouter.put('/:id/assign-class', teacherClassControllers.teacher_assign)
teacherClassRouter.put('/:id', teacherClassControllers.teacher_put);
teacherClassRouter.get('/:id', teacherClassControllers.teacher_get);


module.exports = teacherClassRouter;


