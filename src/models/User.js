const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        require: [true, 'please enter an email'],
        unique: true,
        lowercase: true,
        validate: [isEmail, 'enter a valid email']
    },
    schoolCode: { type: String, required: true, index: true } ,
    password: {
        type: String,
        unique: [true, 'please enter a password'],
        minlength: [6, 'password min length is 6 characters']
    },


});

// function to be fired b4 a data isaved
userSchema.pre('save', async function () {

    const salt = await bcrypt.genSalt()
    this.password = await bcrypt.hash(this.password, salt)
    // const salt = await bcrypt.genSalt();
    // this.password = await bcrypt.hash(this.password , salt);

});
// function to be fired after a  data isaved
// userSchema.post('save', function (doc, next) {
//     console.log('user created and saved')
//     next();
// });

userSchema.statics.login = async function (email, password) {

    const user = await this.findOne({ email: email.trim() })
    if (user) {
        const auth = await bcrypt.compare(password, user.password);
        if (auth) {
            return user;
        }
        throw Error('incorrect password')
    }
    throw Error('email do not exist')
}


const User = mongoose.model('user', userSchema);
module.exports = User;