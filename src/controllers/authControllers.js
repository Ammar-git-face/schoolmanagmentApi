const User = require("../models/User");
const jwt = require('jsonwebtoken');


const handleError = (err) => {
    console.log(err.message, err.code)
    let error = { email: '', password: '' };


    // incoreect emial 
    if (err.message === 'email do not exist') {
        error.email = 'that email is not registered'
    }
    if (err.message === 'incorrect password') {
        error.password = 'that password is not correct you idiot'
    }
    //duplicate email error code 
    if (err.code === 11000) {
        error.email = 'email already already registered'
        return error;
    }



    //validation

    if (err.message.includes('user validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            error[properties.path] = properties.message;
        })
    }
    return error;


};
//creating jwt func 

const maxAge = 60;
const createToken = (id) => {
    return jwt.sign({ id }, 'amar health secret', {
        expiresIn: maxAge
    });
}

module.exports.signup_get = (req, res) => {
    res.send('signup get')
}
module.exports.home_post = (req, res) => {
    // res.locals.user was populated by your checkUser middleware
    if (res.locals.user) {
        // Send the user object so the frontend has data to display
        res.status(200).json({
            user: res.locals.user
        });
    } else {
        // If no user was found in res.locals, the checkUser middleware failed
        res.status(401).json({ error: "Unauthorized access" });
    }
};
module.exports.login_get = (req, res) => {
    res.send('iguwewigueo')
}

module.exports.signup_post = async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.create({ email, password });
        const token = createToken(user._id);
        res.cookie('jwt', token, { maxAge: maxAge * 1000 });
        res.status(201).json({ user: user._id });
    } catch (err) {
        const error = handleError(err)
        res.status(400).json({ error })

    }

}
module.exports.login_post = async (req, res) => {

    const { email, password } = req.body

    try {
        const user = await User.login(email, password)
        const token = createToken(user._id);
        res.cookie('jwt', token, { maxAge: maxAge * 1000 });
        res.status(200).json({ user: user._id })
    } catch (err) {
        const error = handleError(err)
        res.status(400).json({ error })
        console.log(err.message)
    }
}

module.exports.logout_get = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 })
    res.json('logout')
}