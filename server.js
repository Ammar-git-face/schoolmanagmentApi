// =====================================================
// server.js  — FIXED
// KEY FIXES:
//  1. /payroll/owner-login and /payroll/owner-register are now
//     registered BEFORE attachSchool so they don't require a token
//  2. Super admin routes added at /superadmin
// =====================================================
require('dotenv').config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require('cors')
const cookieParser = require('cookie-parser')
const http = require('http')
const { Server } = require('socket.io')
const Message = require('./src/models/Message')

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

const fs = require('fs')
if (fs.existsSync('.env')) require('dotenv').config()

// ── Middleware ────────────────────────────────────
const { attachSchool } = require("./src/middlewares/schoolMiddleware.js")

// ── Route imports ─────────────────────────────────
const authRoutes = require("./src/routes/authRoutes")
const schoolRoutes = require("./src/routes/Schoolroutes")
const studentRoute = require('./src/routes/studentRoutes')
const teacherRoutes = require('./src/routes/teacherRoutes')
const classRoute = require('./src/routes/classRoutes')
const dashrouter = require('./src/routes/dashboardRoutes')
const alertRoute = require('./src/routes/alertRoutes')
const rollrouter = require("./src/routes/Payrollroutes")
const feeroute = require('./src/routes/feeRoute')
const subjectRoutes = require('./src/routes/Subjectroutes')
const ptarouter = require('./src/routes/ptaRoute')
const teacherSalaryrouter = require('./src/routes/TeacherSalaryRoute')
const teacherClassRouter = require('./src/routes/teacherClassRoutes')
const atnrouter = require('./src/routes/attendanceroutes')
const resultRouter = require('./src/routes/resultRoute')
const msgrouter = require('./src/routes/messageRoute')
const superAdminRoutes = require('./src/routes/superAdminroutes')   // ✅ NEW

// ── Public routes (NO auth required) ─────────────
app.use('/auth', authRoutes)
app.use('/school', schoolRoutes)        // registerSchool is public inside this router
app.use('/superadmin', superAdminRoutes) // ✅ Super admin dashboard API

// ✅ FIX: owner-login and owner-register must be public (no attachSchool)
//    They were previously caught by:  app.use('/payroll', attachSchool, rollrouter)
//    which rejected them with "No token provided" because the user has no token yet.
const { ownerLogin, ownerRegister, testEmail } = require('./src/controllers/Payrollcontroller')
app.post('/payroll/owner-login', ownerLogin)
app.post('/payroll/owner-register', ownerRegister)
//app.post('/payroll/test-email',     testEmail)   // ✅ test: POST { "to": "your@email.com" }

// ── Protected routes (attachSchool required) ─────
app.use('/student', attachSchool, studentRoute)
app.use('/teacher', attachSchool, teacherRoutes)
app.use('/class', attachSchool, classRoute)
app.use('/stats', attachSchool, dashrouter)
app.use('/alert', attachSchool, alertRoute)
app.use('/academic', attachSchool, subjectRoutes)
app.use('/pta', attachSchool, ptarouter)
app.use('/teacherResult', attachSchool, resultRouter)
app.use('/teacherSalary', attachSchool, teacherSalaryrouter)
app.use('/fees', attachSchool, feeroute)
app.use('/result', attachSchool, resultRouter)
app.use('/messages', attachSchool, msgrouter)
app.use('/payroll', attachSchool, rollrouter)   // remaining payroll routes are protected
app.use('/attendance', attachSchool, atnrouter)

// ── Socket.IO ─────────────────────────────────────
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
})

app.get('/superadmin/env-check', (req, res) => {
    res.json({
        email_set: !!process.env.SUPER_ADMIN_EMAIL,
        pass_set: !!process.env.SUPER_ADMIN_PASSWORD,
        email_val: process.env.SUPER_ADMIN_EMAIL,   // remove after confirming
        pass_len: (process.env.SUPER_ADMIN_PASSWORD || '').length
    })
})

const onlineUsers = {}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('register', (userId) => {
        if (!userId) return  // guard: never register undefined
        onlineUsers[String(userId)] = socket.id   // always coerce to string
        io.emit("online_users", Object.keys(onlineUsers))
    })

    socket.on('sendMessage', async (data) => {
        const { senderId, receiverId, message } = data

        if (!senderId || !receiverId || !message?.trim())
            return socket.emit('messageError', 'senderId, receiverId and message are required')

        const conversationId = [senderId, receiverId].sort().join('_')

        try {
            const Admin = require('./src/models/Admin')
            const Teacher = require('./src/models/Teachers')
            const Parent = require('./src/models/Parent')

            // ✅ resolveUser — handles both 'fullname' and 'name' fields across models
            const resolveUser = async (id) => {
                let doc
                doc = await Admin.findById(id, 'fullname name role schoolCode').lean()
                if (doc) return { name: doc.fullname || doc.name || 'Admin', role: 'admin', schoolCode: doc.schoolCode }
                doc = await Teacher.findById(id, 'fullname name role schoolCode').lean()
                if (doc) return { name: doc.fullname || doc.name || 'Teacher', role: 'teacher', schoolCode: doc.schoolCode }
                doc = await Parent.findById(id, 'fullname name role schoolCode').lean()
                if (doc) return { name: doc.fullname || doc.name || 'Parent', role: 'parent', schoolCode: doc.schoolCode }
                return null
            }

            const sender = await resolveUser(senderId)
            const receiver = await resolveUser(receiverId)

            if (!sender) return socket.emit('messageError', 'Sender not found')
            if (!receiver) return socket.emit('messageError', 'Receiver not found')

            const sc = sender.schoolCode
            if (!sc) return socket.emit('messageError', 'Sender has no school code')

            const newMessage = await Message.create({
                senderId,
                senderName: sender.name,
                senderRole: sender.role,
                receiverId,
                receiverName: receiver.name,
                receiverRole: receiver.role,
                message: message.trim(),
                conversationId,
                schoolCode: sc
            })

            // always coerce to string — ObjectId vs string mismatch is silent and deadly
            const receiverSocketId = onlineUsers[String(receiverId)]
            if (receiverSocketId) io.to(receiverSocketId).emit('receiveMessage', newMessage)
            socket.emit('messageSent', newMessage)
        } catch (err) {
            console.error('sendMessage socket error:', err.message)
            socket.emit('messageError', err.message)
        }
    })

    socket.on('mark_read', ({ userId, otherId }) => {
        const otherSocketId = onlineUsers[String(otherId)]
        if (otherSocketId) io.to(otherSocketId).emit('messages_read', { by: userId })
    })

    socket.on('typing', ({ senderId, receiverId }) => {
        const s = onlineUsers[String(receiverId)]
        if (s) io.to(s).emit('typing', { senderId })
    })

    socket.on('stopTyping', ({ senderId, receiverId }) => {
        const s = onlineUsers[String(receiverId)]
        if (s) io.to(s).emit('stopTyping', { senderId })
    })

    socket.on('disconnect', () => {
        Object.keys(onlineUsers).forEach(key => {
            if (onlineUsers[key] === socket.id) delete onlineUsers[key]
        })
        io.emit("online_users", Object.keys(onlineUsers))
    })
})

// ── DB + Start ────────────────────────────────────
const dburl = process.env.MONGO_URI || "mongodb://localhost:27017/schoolDb"

// mongoose.connect(dburl)
//     .then(() => server.listen(5000, () => console.log('✅ Server running on port 5000')))
//     .catch(err => console.log('❌ DB connection error:', err))

mongoose.connect(dburl)
    .then(() => {
        console.log('✅ MongoDB connected to:', dburl.substring(0, 40))
        server.listen(5000, () => console.log('✅ Server running on port 5000'))
    })
    .catch(err => console.log('❌ DB connection error:', err.message))