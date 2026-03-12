// const jwt = require('jsonwebtoken');
// const User = require('../models/User');


// //printing user name in the header
// const checkUser = (req, res, next) => {
//     const token = req.cookies.jwt;

//     if (token) {
//         jwt.verify(token, 'amar health secret', async (err, decodedToken) => {
//             if (err) {
//                 console.log(err.message)
//                 res.locals.User = null;
//                 next()

//             } else {
//                 console.log(decodedToken)
//                 // geting the user info
//                 let user = await user.findById(decodedToken.id)
//                 res.locals.User = User
//                 next();

//             }
//         })

//     }
//     else {
//         res.locals.user = null;
//         next()
//     }
// }

// const requireAuth = (req, res, next) => {
//     const token = req.cookies.jwt;

//     //checking if token exist
//     if (token) {
//         jwt.verify(token, 'amar health secret', (err, decodedToken) => {
//             if (err) {
//                 console.log(err.message)
//                 res.redirect('localhsot:3000/component/login')
//             } else {
//                 console.log(decodedToken)
//                 next()

//             }
//         })
//     } else {

//         res.status(401).json({ redirect: '/login' });
//     }
// }


// module.exports = { requireAuth, checkUser };

// existing authmiddlewares.js — just add these at the bottom

const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET

// verify token and attach user to request
exports.protect = (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1]
        if (!token) return res.status(401).json({ error: 'Not authorized, no token' })

        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded // { id, role }
        next()
    } catch (err) {
        res.status(401).json({ error: 'Not authorized, invalid token' })
    }
}

// restrict to specific roles
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission' })
        }
        next()
    }
}

const { protect, restrictTo } = require('../middlewares/authmiddlewares')