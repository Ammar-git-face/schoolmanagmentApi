// src/routes/pushRoutes.js
const express    = require("express")
const router     = express.Router()
const pushCtrl   = require("../controllers/pushController")
const { attachSchool } = require("../middlewares/schoolMiddleware")

// Public — needs VAPID key before auth
router.get("/vapid-public-key", pushCtrl.getVapidKey)

// Protected
router.post("/subscribe",   attachSchool, pushCtrl.subscribe)
router.post("/unsubscribe", attachSchool, pushCtrl.unsubscribe)

module.exports = router