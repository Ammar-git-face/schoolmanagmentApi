const  {Router}  = require('express')
const alertControllers = require('../controllers/alert.controlllers')
const alertRoute = Router()

alertRoute.post('/', alertControllers.alert_post)
alertRoute.get('/', alertControllers.alert_get)
alertRoute.get('/count', alertControllers.alert_count )

module.exports =  alertRoute;

