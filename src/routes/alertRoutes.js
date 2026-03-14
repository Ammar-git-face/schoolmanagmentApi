const { Router } = require('express')
const alertControllers = require('../controllers/alert.controlllers')
const alertRoute = Router()

alertRoute.post('/',               alertControllers.alert_post)
alertRoute.get('/get',             alertControllers.alert_get)
alertRoute.get('/count',           alertControllers.alert_count)
// ✅ FIX: sidebar polls this — was 404 because route didn't exist
// Maps to the same alert_count function — returns { count: N }
alertRoute.get('/unread-count',    alertControllers.alert_count)
alertRoute.delete('/:id',          alertControllers.alert_delete)
alertRoute.put('/alert/:id',       alertControllers.alert_update)

module.exports = alertRoute