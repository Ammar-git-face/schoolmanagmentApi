// =====================================================
// routes/superAdminRoutes.js  — NEW
// =====================================================
const express = require('express')
const router  = express.Router()
const {
    getDashboardStats,
    getAllSchools,
    toggleSchoolStatus,
    updatePlan,
    deleteSchool,
    superAdminLogin
} = require('../controllers/superAdminController')

// Public
router.post('/login', superAdminLogin)

// Protected (add your own super admin JWT middleware if needed)
router.get('/stats',           getDashboardStats)
router.get('/schools',         getAllSchools)
router.put('/toggle/:id',      toggleSchoolStatus)
router.put('/plan/:id',        updatePlan)
router.delete('/school/:id',   deleteSchool)

module.exports = router