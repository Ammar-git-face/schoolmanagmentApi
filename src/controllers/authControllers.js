// const User = require("../models/User");
// const jwt = require('jsonwebtoken');


// const handleError = (err) => {
//     console.log(err.message, err.code)
//     let error = { email: '', password: '' };


//     // incoreect emial 
//     if (err.message === 'email do not exist') {
//         error.email = 'that email is not registered'
//     }
//     if (err.message === 'incorrect password') {
//         error.password = 'that password is not correct you idiot'
//     }
//     //duplicate email error code 
//     if (err.code === 11000) {
//         error.email = 'email already already registered'
//         return error;
//     }



//     //validation

//     if (err.message.includes('user validation failed')) {
//         Object.values(err.errors).forEach(({ properties }) => {
//             error[properties.path] = properties.message;
//         })
//     }
//     return error;


// };
// //creating jwt func 

// const maxAge = 60;
// const createToken = (id) => {
//     return jwt.sign({ id }, 'amar health secret', {
//         expiresIn: maxAge
//     });
// }

// module.exports.signup_get = (req, res) => {
//     res.send('signup get')
// }
// module.exports.home_post = (req, res) => {
//     // res.locals.user was populated by your checkUser middleware
//     if (res.locals.user) {
//         // Send the user object so the frontend has data to display
//         res.status(200).json({
//             user: res.locals.user
//         });
//     } else {
//         // If no user was found in res.locals, the checkUser middleware failed
//         res.status(401).json({ error: "Unauthorized access" });
//     }
// };
// module.exports.login_get = (req, res) => {
//     res.send('iguwewigueo')
// }

// module.exports.signup_post = async (req, res) => {
//     const { email, password } = req.body
//     try {
//         const user = await User.create({ email, password });
//         const token = createToken(user._id);
//         res.cookie('jwt', token, { maxAge: maxAge * 1000 });
//         res.status(201).json({ user: user._id });
//     } catch (err) {
//         const error = handleError(err)
//         res.status(400).json({ error })

//     }

// }
// module.exports.login_post = async (req, res) => {

//     const { email, password } = req.body

//     try {
//         const user = await User.login(email, password)
//         const token = createToken(user._id);
//         res.cookie('jwt', token, { maxAge: maxAge * 1000 });
//         res.status(200).json({ user: user._id })
//     } catch (err) {
//         const error = handleError(err)
//         res.status(400).json({ error })
//         console.log(err.message)
//     }
// }

// module.exports.logout_get = (req, res) => {
//     res.cookie('jwt', '', { maxAge: 1 })
//     res.json('logout')
// }

const bcrypt   = require('bcrypt')
const jwt      = require('jsonwebtoken')
const Admin    = require('../models/admin')
const Teacher  = require('../models/Teachers')
const Parent   = require('../models/Parent')
const Student  = require('../models/student')
const School   = require('../models/school')

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'

const createToken = (id, role, schoolCode) =>
    jwt.sign({ id, role, schoolCode }, JWT_SECRET, { expiresIn: '7d' })

const setTokenCookie = (res, token) =>
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })

// ── ADMIN ─────────────────────────────────────────────────────────
exports.admin_register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body
        const exists = await Admin.findOne({ email })
        if (exists) return res.status(400).json({ error: 'Admin already exists' })
        const admin = await Admin.create({ fullname, email, password })
        res.json({ message: 'Admin created', admin })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.admin_login = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await Admin.findOne({ email })
        if (!admin) return res.status(404).json({ error: 'Admin not found' })

        const match = await bcrypt.compare(password, admin.password)
        if (!match) return res.status(401).json({ error: 'Wrong password' })

        // Fetch school info
        const school = await School.findOne({ schoolCode: admin.schoolCode }).lean()

        const token = createToken(admin._id, 'admin', admin.schoolCode)
        setTokenCookie(res, token)

        res.json({
            token,
            user: {
                id:            admin._id,
                name:          admin.name || admin.fullname || '',
                email:         admin.email,
                role:          'admin',
                schoolCode:    admin.schoolCode,
                schoolName:    school?.name    || '',
                schoolLogo:    school?.logo    || '',
                schoolPhone:   school?.phone   || '',
                schoolAddress: school?.address || '',
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.adminChangePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body
        if (!oldPassword || !newPassword)
            return res.status(400).json({ error: 'Both fields are required' })
        if (newPassword.length < 6)
            return res.status(400).json({ error: 'New password must be at least 6 characters' })

        // Read token from cookie or Authorization header
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]
        if (!token) return res.status(401).json({ error: 'No token provided' })

        const decoded = jwt.verify(token, JWT_SECRET)
        const admin = await Admin.findById(decoded.id)
        if (!admin) return res.status(404).json({ error: 'Admin not found' })

        const match = await bcrypt.compare(oldPassword, admin.password)
        if (!match) return res.status(401).json({ error: 'Current password is incorrect' })

        admin.password = await bcrypt.hash(newPassword, 10)
        await admin.save()
        res.json({ message: 'Password changed successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── TEACHER ────────────────────────────────────────────────────────
exports.teacher_create_account = async (req, res) => {
    try {
        const { teacherId, password } = req.body
        const teacher = await Teacher.findById(teacherId)
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
        if (teacher.password) return res.status(400).json({ error: 'Account already exists' })
        teacher.password = password
        await teacher.save()
        res.json({ message: 'Teacher account created successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.teacherRegister = async (req, res) => {
    try {
        const { name, email, password, phone, schoolCode } = req.body
        if (!name || !email || !password || !schoolCode)
            return res.status(400).json({ error: 'name, email, password, schoolCode required' })

        const school = await School.findOne({ schoolCode: schoolCode.toUpperCase() })
        if (!school) return res.status(404).json({ error: 'Invalid school code — check with your admin' })

        const exists = await Teacher.findOne({ email, schoolCode: schoolCode.toUpperCase() })
        if (exists) return res.status(400).json({ error: 'Email already registered for this school' })

        const hashed = await bcrypt.hash(password, 10)
        await Teacher.create({ name, email, password: hashed, phone: phone || '', schoolCode: schoolCode.toUpperCase() })
        res.status(201).json({ message: 'Teacher account created. You can now log in.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.teacher_Login = async (req, res) => {
    try {
        const { email, password } = req.body
        const teacher = await Teacher.findOne({ email })
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        // const isMatch = await bcrypt.compare(password, teacher.password)
        //if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })

        // ✅ Token now included
        const token = createToken(teacher._id, 'teacher', teacher.schoolCode)
        setTokenCookie(res, token)

        res.json({
            token,
            user: {
                id:             teacher._id,
                name:           teacher.fullname,
                email:          teacher.email,
                role:           'teacher',
                schoolCode:     teacher.schoolCode,
                subject:        teacher.subject,
                assignedClasses: teacher.assignedClasses || [],
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.teacher_update = async (req, res) => {
    try {
        const { fullname, oldPassword, newPassword } = req.body
        const teacher = await Teacher.findById(req.params.id)
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        if (newPassword) {
            const match = await bcrypt.compare(oldPassword, teacher.password)
            if (!match) return res.status(401).json({ error: 'Current password is incorrect' })
            teacher.password = newPassword
        }
        if (fullname) teacher.fullname = fullname
        await teacher.save()
        res.json({ message: 'Updated successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── PARENT ─────────────────────────────────────────────────────────
exports.parentRegister = async (req, res) => {
    try {
        const { name, email, password, phone, schoolCode } = req.body
        if (!name || !email || !password || !schoolCode)
            return res.status(400).json({ error: 'name, email, password, schoolCode required' })

        const school = await School.findOne({ schoolCode: schoolCode.toUpperCase() })
        if (!school) return res.status(404).json({ error: 'Invalid school code — check with your child\'s school' })

        const exists = await Parent.findOne({ email, schoolCode: schoolCode.toUpperCase() })
        if (exists) return res.status(400).json({ error: 'Email already registered for this school' })

        const hashed = await bcrypt.hash(password, 10)
        await Parent.create({ name, email, password: hashed, phone: phone || '', schoolCode: schoolCode.toUpperCase() })
        res.status(201).json({ message: 'Parent account created. You can now log in.' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.parent_generate_code = async (req, res) => {
    try {
        const { studentIds } = req.body
        const code = 'FAM-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase()
        await Student.updateMany({ _id: { $in: studentIds } }, { familyCode: code })
        res.json({ message: 'Family code generated', code })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.parent_register = async (req, res) => {
    try {
        const { fullname, email, password, familyCode } = req.body
        const students = await Student.find({ familyCode })
        if (students.length === 0) return res.status(400).json({ error: 'Invalid family code' })

        const exists = await Parent.findOne({ email })
        if (exists) return res.status(400).json({ error: 'Email already registered' })

        // Get schoolCode from the student record
        const schoolCode = students[0].schoolCode

        const hashed = await bcrypt.hash(password, 10)
        const parent = await Parent.create({ fullname, email, password: hashed, familyCode, schoolCode })
        await Student.updateMany({ familyCode }, { parentId: parent._id })

        const token = createToken(parent._id, 'parent', schoolCode)
        setTokenCookie(res, token)
        res.json({ token, role: 'parent', id: parent._id, name: parent.fullname })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.parent_Login = async (req, res) => {
    try {
        const { email, password } = req.body
        const parent = await Parent.findOne({ email })
        if (!parent) return res.status(404).json({ error: 'Parent not found' })

        const isMatch = await bcrypt.compare(password, parent.password)
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })

        const children = await Student.find({ parentId: parent._id }, '_id fullname studentClass').lean()

        // ✅ Token now included
        const token = createToken(parent._id, 'parent', parent.schoolCode)
        setTokenCookie(res, token)

        res.json({
            token,
            user: {
                id:        parent._id,
                name:      parent.fullname,
                email:     parent.email,
                role:      'parent',
                schoolCode: parent.schoolCode,
                children,
            }
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.parent_update = async (req, res) => {
    try {
        const { fullname, oldPassword, newPassword } = req.body
        const parent = await Parent.findById(req.params.id)
        if (!parent) return res.status(404).json({ error: 'Parent not found' })

        if (newPassword) {
            const match = await bcrypt.compare(oldPassword, parent.password)
            if (!match) return res.status(401).json({ error: 'Current password is incorrect' })
            parent.password = newPassword
        }
        if (fullname) parent.fullname = fullname
        await parent.save()
        res.json({ message: 'Updated successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── SHARED ─────────────────────────────────────────────────────────
exports.get_me = async (req, res) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]
        if (!token) return res.status(401).json({ error: 'No token' })

        const decoded = jwt.verify(token, JWT_SECRET)
        let user
        if (decoded.role === 'admin')   user = await Admin.findById(decoded.id).select('-password')
        if (decoded.role === 'teacher') user = await Teacher.findById(decoded.id).select('-password')
        if (decoded.role === 'parent')  user = await Parent.findById(decoded.id).select('-password')

        if (!user) return res.status(404).json({ error: 'User not found' })
        res.json({ ...user.toObject(), role: decoded.role })
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' })
    }
}

exports.logout = (req, res) => {
    res.clearCookie('token')
    res.json({ message: 'Logged out successfully' })
}