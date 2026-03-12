const express = require('express')
const router  = express.Router()
const {
    student_post,
    student_get,
    student_delete,
    class_update,
    student_by_parent
} = require('../controllers/studentController')

router.post('/',                    student_post)
router.get('/getStudent',           student_get)
router.get('/parent/:parentId',     student_by_parent)  // ✅ must be BEFORE /:id
router.put('/:id',                  class_update)
router.delete('/:id',               student_delete)

module.exports = router