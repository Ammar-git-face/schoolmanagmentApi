const express = require('express')
const teacherRoutes  = express.Router()
const {
    teacher_post,
    get_teacher,
    get_teacher_by_id,
    teacher_delete,
    teacher_update,
    teacher_dashboard_stats,
    assign_class,
    remove_class
} = require('../controllers/teacherControllers')

teacherRoutes.post('/',                        teacher_post)
teacherRoutes.get('/getTeachers',              get_teacher)
teacherRoutes.get('/dashboard-stats/:id',      teacher_dashboard_stats)
teacherRoutes.put('/:id/assign-class',         assign_class)
teacherRoutes.put('/:id/remove-class',         remove_class)
teacherRoutes.put('/:id',                      teacher_update)
teacherRoutes.delete('/:id',                   teacher_delete)
teacherRoutes.get('/:id',                      get_teacher_by_id)

module.exports = teacherRoutes