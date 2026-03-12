const express      = require('express')
const resultRouter = express.Router()
const c            = require('../controllers/resultsControllers')
const { generateReportCard } = require('../controllers/reportController')

// Teacher result entry
resultRouter.post('/save-draft-bulk',               c.save_draft_bulk)
resultRouter.put('/submit/:subject/:term/:session', c.submit_to_admin)
resultRouter.get('/class/:className',               c.get_class_sheet)
resultRouter.get('/teacher/:teacherId',             c.get_teacher_results)

// Admin
resultRouter.get('/admin/pending',                  c.get_pending_approval)
resultRouter.post('/approve',                       c.approve_results)

// Parent
resultRouter.get('/approved',                       c.get_approved_results)
resultRouter.get('/report-card/:studentId',         generateReportCard)

// Legacy
resultRouter.post('/',      c.result_post)
resultRouter.get('/',       c.result_get)
resultRouter.put('/:id',    c.result_put)
resultRouter.delete('/:id', c.result_delete)

module.exports = resultRouter