const { Router } = require("express")
const authControllers = require("../controllers/authControllers")
const { requireAuth } = require('../middlewares/authMiddlewares')

const route = Router();

route.get('/signup', authControllers.signup_get)
route.get('/login', authControllers.login_get)
route.post('/signup', authControllers.signup_post)
route.post('/login', authControllers.login_post)
route.get('/logout', authControllers.logout_get)
// In your backend routes file
route.get('/protected-route', requireAuth , (req, res) => {

    res.json({ 
        message: "This data came from the backend!",
        user: req.user
    });
});
route.get('/logout', authControllers.logout_get)


module.exports = route;