// =====================================================
// routes/schoolRoutes.js
// =====================================================
const express = require("express")
const router  = express.Router()
const { attachSchool } = require("../middlewares/schoolMiddleware.js")
const {
    registerSchool,
    getSchoolInfo,
    uploadLogo,
    updateSchoolInfo
} = require("../controllers/Schoolcontroller")

router.post("/register", registerSchool)              // public — no auth
router.get("/info", attachSchool, getSchoolInfo)      // protected
router.put("/logo", attachSchool, uploadLogo)         // protected
router.put("/update", attachSchool, updateSchoolInfo) // protected

module.exports = router