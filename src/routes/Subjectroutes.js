const express = require('express')
const router = express.Router()
const {
    createSubject, getSubjects, updateSubject,
    deleteSubject, getClassesWithSubjects,
    submitCA, submitExam, getClassResults,
    approveResults, addRemarks, getReportCard
} = require('../controllers/SubjectController')

// Subject management
router.post('/create', createSubject)
router.get('/all', getSubjects)
router.put('/update/:id', updateSubject)
router.delete('/delete/:id', deleteSubject)
router.get('/classes', getClassesWithSubjects)

// Academic results
router.post('/ca/submit', submitCA)
router.post('/exam/submit', submitExam)
router.get('/class-results', getClassResults)
router.post('/approve', approveResults)
router.post('/remarks', addRemarks)
router.get('/report-card/:studentId', getReportCard)

module.exports = router

// ADD TO server.js:
// const subjectRoutes = require('./routes/subjectRoutes')
// app.use('/academic', subjectRoutes)