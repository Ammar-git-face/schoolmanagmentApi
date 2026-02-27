const express = require('express')
const dashrouter = express.Router()
const dashboardController = require('../controllers/dashboardControllers');

dashrouter.get("/dashboard-stats", dashboardController.dashboardStats);

module.exports = dashrouter;