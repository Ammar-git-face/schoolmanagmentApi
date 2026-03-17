require('dotenv').config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require('cors')
const cookieParser = require('cookie-parser')
const http = require('http')
const { Server } = require('socket.io')

// ── Model imports at top level — NOT inside socket handlers ──────────────────
// FIX: use exact lowercase filenames — Linux (Render) is case-sensitive
const Message = require('./src/models/Message')
const Admin   = require('./src/models/admin')      // was './src/models/Admin' — crashed on Render
const Teacher = require('./src/models/Teachers')
const Parent  = require('./src/models/parent')     // was './src/models/Parent' — crashed on Render

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
    'http://localhost:3000',
    'https://your-frontend.vercel.app'
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

const fs = require('fs')
if (fs.existsSync('.env')) require('dotenv').config()
console.log('MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET')

// ── Middleware ────────────────────────────────────
const { attachSchool } = require("./src/middlewares/schoolMiddleware.js")

// ── Route imports ─────────────────────────────────
const authRoutes          = require("./src/routes/authRoutes")
const schoolRoutes        = require("./src/routes/Schoolroutes")
const studentRoute        = require('./src/routes/studentRoutes')
const teacherRoutes       = require('./src/routes/teacherRoutes')
const classRoute          = require('./src/routes/classRoutes')
const dashrouter          = require('./src/routes/dashboardRoutes')
const alertRoute          = require('./src/routes/alertRoutes')
const rollrouter          = require("./src/routes/Payrollroutes")
const feeroute            = require('./src/routes/feeRoute')
const subjectRoutes       = require('./src/routes/Subjectroutes')
const ptarouter           = require('./src/routes/ptaRoute')
const teacherSalaryrouter = require('./src/routes/TeacherSalaryRoute')
const teacherClassRouter  = require('./src/routes/teacherClassRoutes')
const atnrouter           = require('./src/routes/attendanceroutes')
const resultRouter        = require('./src/routes/resultRoute')
const msgrouter           = require('./src/routes/messageRoute')
const superAdminRoutes    = require('./src/routes/superAdminroutes')

// ── Public routes (NO auth required) ─────────────
app.use('/auth', authRoutes)
app.use('/school', schoolRoutes)
app.use('/superadmin', superAdminRoutes)

const { ownerLogin, ownerRegister, testEmail } = require('./src/controllers/Payrollcontroller')
app.post('/payroll/owner-login',    ownerLogin)
app.post('/payroll/owner-register', ownerRegister)

// ── Protected routes (attachSchool required) ─────
app.use('/student',       attachSchool, studentRoute)
app.use('/teacher',       attachSchool, teacherRoutes)
app.use('/class',         attachSchool, classRoute)
app.use('/stats',         attachSchool, dashrouter)
app.use('/alert',         attachSchool, alertRoute)
app.use('/academic',      attachSchool, subjectRoutes)
app.use('/pta',           attachSchool, ptarouter)
app.use('/teacherResult', attachSchool, resultRouter)
app.use('/teacherSalary', attachSchool, teacherSalaryrouter)
app.use('/fees',          attachSchool, feeroute)
app.use('/result',        attachSchool, resultRouter)
app.use('/messages',      attachSchool, msgrouter)
app.use('/payroll',       attachSchool, rollrouter)
app.use('/attendance',    attachSchool, atnrouter)

// ── Socket.IO ─────────────────────────────────────
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
})

app.get('/superadmin/env-check', (req, res) => {
    res.json({
        email_set: !!process.env.SUPER_ADMIN_EMAIL,
        pass_set:  !!process.env.SUPER_ADMIN_PASSWORD,
        email_val: process.env.SUPER_ADMIN_EMAIL,
        pass_len:  (process.env.SUPER_ADMIN_PASSWORD || '').length
    })
})

const onlineUsers = {}

// resolveUser defined once at module level — not recreated per socket connection
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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('register', (userId) => {
        if (!userId) return
        onlineUsers[String(userId)] = socket.id
        io.emit("online_users", Object.keys(onlineUsers))
    })

    socket.on('sendMessage', async (data) => {
        const { senderId, receiverId, message } = data

        if (!senderId || !receiverId || !message?.trim())
            return socket.emit('messageError', 'senderId, receiverId and message are required')

        const conversationId = [String(senderId), String(receiverId)].sort().join('_')

        try {
            const sender   = await resolveUser(senderId)
            const receiver = await resolveUser(receiverId)

            if (!sender)   return socket.emit('messageError', 'Sender not found')
            if (!receiver) return socket.emit('messageError', 'Receiver not found')

            const sc = sender.schoolCode
            if (!sc) return socket.emit('messageError', 'Sender has no school code')

            // save to MongoDB — this is what persists messages across refreshes
            const newMessage = await Message.create({
                senderId,
                senderName:   sender.name,
                senderRole:   sender.role,
                receiverId,
                receiverName: receiver.name,
                receiverRole: receiver.role,
                message:      message.trim(),
                conversationId,
                schoolCode:   sc
            })

            // deliver to receiver if online
            const receiverSocketId = onlineUsers[String(receiverId)]
            if (receiverSocketId) io.to(receiverSocketId).emit('receiveMessage', newMessage)

            // confirm to sender
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
const PORT  = process.env.PORT || 5000

mongoose.connect(dburl)
    .then(() => {
        console.log('✅ MongoDB connected to:', dburl.substring(0, 40))
        server.listen(PORT, '0.0.0.0', () => console.log(`✅ Server running on port ${PORT}`))
    })
    .catch(err => console.log('❌ DB connection error:', err.message))