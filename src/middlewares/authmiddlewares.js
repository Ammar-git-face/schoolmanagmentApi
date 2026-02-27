const jwt = require('jsonwebtoken');
const User = require('../models/User');


//printing user name in the header
const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, 'amar health secret', async (err, decodedToken) => {
            if (err) {
                console.log(err.message)
                res.locals.User = null;
                next()

            } else {
                console.log(decodedToken)
                // geting the user info
                let user = await user.findById(decodedToken.id)
                res.locals.User = User
                next();

            }
        })

    }
    else {
        res.locals.user = null;
        next()
    }
}

const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    //checking if token exist
    if (token) {
        jwt.verify(token, 'amar health secret', (err, decodedToken) => {
            if (err) {
                console.log(err.message)
                res.redirect('localhsot:3000/component/login')
            } else {
                console.log(decodedToken)
                next()

            }
        })
    } else {

        res.status(401).json({ redirect: '/login' });
    }
}


module.exports = { requireAuth, checkUser };