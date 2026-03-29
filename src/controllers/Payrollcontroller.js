// const Payroll    = require('../models/Payroll')
// const Teacher    = require('../models/Teachers')
// const axios      = require('axios')
// const nodemailer = require('nodemailer')   // ✅ top-level — fails loudly on startup if missing
// const School     = require('../models/school')
// const Admin      = require('../models/admin')

// // Generate payroll for all teachers for a given month/year
// exports.generatePayroll = async (req, res) => {
//     try {
//         const month = req.body.month
//         const year = req.body.year
//         const paidBy = req.body.paidBy || 'Admin'

//         if (!month || !year) return res.status(400).json({ error: 'Month and year are required' })

//         const teachers = await Teacher.find({}, 'fullname salary accountNumber bankCode bankName').lean()
//         if (!teachers.length) return res.status(404).json({ error: 'No teachers found' })

//         const created = []
//         const skipped = []

//         for (const teacher of teachers) {
//             const existing = await Payroll.findOne({ teacherId: teacher._id, month, year })
//             if (existing) { skipped.push(teacher.fullname); continue }

//             const basicSalary = teacher.salary || 0
//             const defaultAllowances = [
//                 { name: 'Transport', amount: 0 },
//                 { name: 'Housing', amount: 0 }
//             ]
//             const defaultDeductions = [
//                 { name: 'Tax (PAYE)', amount: Math.round(basicSalary * 0.05) },
//                 { name: 'Pension', amount: Math.round(basicSalary * 0.08) }
//             ]
//             const totalAllowances = defaultAllowances.reduce((s, a) => s + a.amount, 0)
//             const totalDeductions = defaultDeductions.reduce((s, d) => s + d.amount, 0)
//             const grossPay = basicSalary + totalAllowances
//             const netPay = grossPay - totalDeductions

//             const payroll = await Payroll.create({
//                 teacherId: teacher._id,
//                 teacherName: teacher.fullname,
//                 month, year,
//                 basicSalary,
//                 allowances: defaultAllowances,
//                 deductions: defaultDeductions,
//                 totalAllowances,
//                 totalDeductions,
//                 grossPay,
//                 netPay,
//                 status: 'pending',
//                 paidBy
//             })
//             created.push(payroll)
//         }

//         res.json({ message: `Payroll generated for ${created.length} teachers. ${skipped.length} already existed.`, created, skipped })
//     } catch (err) {
//         console.log('generatePayroll error:', err.message)
//         res.status(500).json({ error: err.message })
//     }
// }

// // Get all payroll records with optional filters
// exports.getPayroll = async (req, res) => {
//     try {
//         const month = req.query.month
//         const year = req.query.year
//         const status = req.query.status

//         const query = {}
//         if (month) query.month = month
//         if (year) query.year = year
//         if (status) query.status = status

//         const records = await Payroll.find(query).sort({ createdAt: -1 }).lean()

//         const totalGross = records.reduce((s, r) => s + r.grossPay, 0)
//         const totalNet = records.reduce((s, r) => s + r.netPay, 0)
//         const totalPaid = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.netPay, 0)
//         const totalPending = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.netPay, 0)

//         res.json({ records, summary: { totalGross, totalNet, totalPaid, totalPending, count: records.length } })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Update a single payroll record (add allowances/deductions)
// exports.updatePayroll = async (req, res) => {
//     try {
//         const { id } = req.params
//         const { allowances, deductions, note } = req.body

//         const payroll = await Payroll.findById(id)
//         if (!payroll) return res.status(404).json({ error: 'Payroll record not found' })
//         if (payroll.status === 'paid') return res.status(400).json({ error: 'Cannot edit a paid payroll' })

//         if (allowances) payroll.allowances = allowances
//         if (deductions) payroll.deductions = deductions
//         if (note !== undefined) payroll.note = note

//         payroll.totalAllowances = payroll.allowances.reduce((s, a) => s + (a.amount || 0), 0)
//         payroll.totalDeductions = payroll.deductions.reduce((s, d) => s + (d.amount || 0), 0)
//         payroll.grossPay = payroll.basicSalary + payroll.totalAllowances
//         payroll.netPay = payroll.grossPay - payroll.totalDeductions

//         await payroll.save()
//         res.json(payroll)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Pay a teacher via Flutterwave transfer
// exports.payTeacher = async (req, res) => {
//     try {
//         const { id } = req.params
//         const payroll = await Payroll.findById(id)
//         if (!payroll) return res.status(404).json({ error: 'Payroll not found' })
//         if (payroll.status === 'paid') return res.status(400).json({ error: 'Already paid' })

//         const teacher = await Teacher.findById(payroll.teacherId).lean()
//         if (!teacher?.accountNumber || !teacher?.bankCode) {
//             return res.status(400).json({ error: 'Teacher bank details incomplete' })
//         }

//         const txRef = `PAYROLL-${payroll._id}-${Date.now()}`

//         const response = await axios.post(
//             'https://api.flutterwave.com/v3/transfers',
//             {
//                 account_bank: teacher.bankCode,
//                 account_number: teacher.accountNumber,
//                 amount: payroll.netPay,
//                 currency: 'NGN',
//                 reference: txRef,
//                 narration: `${payroll.month} ${payroll.year} Salary - ${teacher.fullname}`,
//                 callback_url: `${process.env.BACKEND_URL}/payroll/verify/${payroll._id}`
//             },
//             { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
//         )

//         if (response.data.status === 'success') {
//             payroll.status = 'paid'
//             payroll.txRef = txRef
//             payroll.flwRef = response.data.data?.id?.toString()
//             payroll.paidAt = new Date()
//             await payroll.save()
//             res.json({ message: 'Payment initiated successfully', data: response.data })
//         } else {
//             res.status(400).json({ error: 'Payment failed', details: response.data })
//         }
//     } catch (err) {
//         console.log('payTeacher error:', err.message)
//         res.status(500).json({ error: err.message })
//     }
// }

// // Mark as paid manually (cash payment)
// exports.markAsPaid = async (req, res) => {
//     try {
//         const { id } = req.params
//         const payroll = await Payroll.findById(id)
//         if (!payroll) return res.status(404).json({ error: 'Payroll not found' })
//         if (payroll.status === 'paid') return res.status(400).json({ error: 'Already paid' })

//         payroll.status = 'paid'
//         payroll.paymentMethod = 'cash'
//         payroll.paidAt = new Date()
//         await payroll.save()
//         res.json({ message: 'Marked as paid', payroll })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Owner dashboard stats
// exports.getOwnerStats = async (req, res) => {
//     try {
//         const Student = require('../models/student')
//         const Teacher = require('../models/Teachers')
//         const Parent = require('../models/parent')
//         const Fee = require('../models/fee')
//         const Attendance = require('../models/Attendance')

//         const currentYear = new Date().getFullYear().toString()
//         const currentMonth = new Date().toLocaleString('en-NG', { month: 'long' })

//         const [totalStudents, totalTeachers, totalParents] = await Promise.all([
//             Student.countDocuments(),
//             Teacher.countDocuments(),
//             Parent.countDocuments(),
//             Attendance.countDocuments()
//         ])

//         // Fee stats
//         const allFees = await Fee.find().lean()
//         const totalFeesCollected = allFees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
//         const totalFeesPending = allFees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
//         const feeCollectionRate = allFees.length > 0
//             ? Math.round(allFees.filter(f => f.status === 'paid').length / allFees.length * 100)
//             : 0

//         // Payroll stats for current month
//         const payrollRecords = await Payroll.find({ month: currentMonth, year: currentYear }).lean()
//         const totalPayrollPaid = payrollRecords.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPay, 0)
//         const totalPayrollPending = payrollRecords.filter(p => p.status === 'pending').reduce((s, p) => s + p.netPay, 0)

//         // Monthly fee collection for last 6 months
//         // Monthly fee collection for last 6 months
//         const months = []
//         for (let i = 5; i >= 0; i--) {
//             const d = new Date()
//             d.setDate(1)                    // avoid day overflow
//             d.setMonth(d.getMonth() - i)
//             months.push({
//                 month: d.toLocaleString('en-NG', { month: 'short' }),
//                 year: d.getFullYear(),
//                 monthIndex: d.getMonth()    // 0-based numeric month — no string parsing needed
//             })
//         }

//         const monthlyRevenue = await Promise.all(months.map(async ({ month, year, monthIndex }) => {
//             const start = new Date(year, monthIndex, 1)         // first day of month
//             const end = new Date(year, monthIndex + 1, 1)     // first day of next month

//             const fees = await Fee.find({
//                 status: 'paid',
//                 paidAt: { $gte: start, $lt: end }
//             }).lean()

//             return { month, amount: fees.reduce((s, f) => s + f.amount, 0) }
//         }))

//         // Attendance rate overall
//         const attendanceRecords = await Attendance.find().lean()
//         const totalAttendance = attendanceRecords.length
//         const presentCount = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length
//         const overallAttendanceRate = totalAttendance > 0 ? Math.round(presentCount / totalAttendance * 100) : 0

//         // Recent fee payments
//         const recentPayments = await Fee.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(5).lean()

//         res.json({
//             totalStudents, totalTeachers, totalParents,
//             totalFeesCollected, totalFeesPending, feeCollectionRate,
//             totalPayrollPaid, totalPayrollPending,
//             monthlyRevenue,
//             overallAttendanceRate,
//             recentPayments,
//             currentMonth, currentYear
//         })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Owner login
// exports.ownerLogin = async (req, res) => {
//     try {
//         const bcrypt = require('bcrypt')
//         const jwt    = require('jsonwebtoken')
//         const Owner  = require('../models/Owner')

//         const { email, password } = req.body

//         const owner = await Owner.findOne({ email })
//         if (!owner) return res.status(404).json({ error: 'Owner account not found' })

//         // ✅ Check school is still active before allowing login
//         if (owner.isActive === false)
//             return res.status(403).json({ error: 'Your school account has been deactivated. Contact support.' })

//         const isMatch = await bcrypt.compare(password, owner.password)
//         if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })

//         // ✅ Issue JWT with schoolCode — required for attachSchool middleware
//         const token = jwt.sign(
//             { id: owner._id, role: 'owner', schoolCode: owner.schoolCode },
//             process.env.JWT_SECRET || 'your_jwt_secret',
//             { expiresIn: '7d' }
//         )

//         res.cookie('token', token, {
//             httpOnly: true,
//             maxAge:   7 * 24 * 60 * 60 * 1000,
//             sameSite: 'lax'
//         })

//         res.json({
//             token,
//             user: {
//                 id:           owner._id,
//                 fullname:     owner.fullname,
//                 email:        owner.email,
//                 schoolName:   owner.schoolName,
//                 schoolCode:   owner.schoolCode,
//                 schoolAddress: owner.schoolAddress || '',
//                 plan:         owner.plan,
//                 role:         'owner',
//                 isActive:     owner.isActive
//             }
//         })
//     } catch (err) {
//         console.error('ownerLogin error:', err.message)
//         res.status(500).json({ error: err.message })
//     }
// }

// // Add this function to your payrollController.js
// // and add the route to your rollrouter

// // ============ OWNER REGISTER ============
// exports.ownerRegister = async (req, res) => {
//     try {
//         const bcrypt      = require('bcrypt')
//         const Owner       = require('../models/Owner')
//      //   const Admin       = require('../models/admin')
//         const { fullname, email, password, phone, schoolName, schoolAddress, plan } = req.body

//         if (!fullname || !email || !password || !schoolName)
//             return res.status(400).json({ error: 'fullname, email, password and schoolName are required' })

//         // ── Check duplicate ─────────────────────────────────────────────────
//         const exists = await Owner.findOne({ email })
//         if (exists) return res.status(400).json({ error: 'Email already registered' })

//         // ── Generate unique schoolCode ──────────────────────────────────────
//         // 8-char uppercase alphanumeric — unique enough for school codes
//         const generateCode = () =>
//             Math.random().toString(36).substring(2, 10).toUpperCase()

//         let schoolCode = generateCode()
//         // Ensure uniqueness — retry if clash (extremely rare)
//         while (await Owner.findOne({ schoolCode })) schoolCode = generateCode()

//         // ── Create Owner record ─────────────────────────────────────────────
//         const hashedOwner = await bcrypt.hash(password, 10)
//         const owner = await Owner.create({
//             fullname,
//             email,
//             password: hashedOwner,
//             phone:          phone          || '',
//             schoolName,
//             schoolAddress:  schoolAddress  || '',
//             schoolCode,
//             plan:           plan           || 'free',
//             role:           'owner',
//             isActive:       true
//         })

//         // ── Create School record ───────────────────────────────────────────
//         // School model is used by uploadLogo, getSchoolInfo, dashboard etc.
//         // Without this record, logo upload silently fails (findOneAndUpdate finds nothing)
//         const schoolExists = await School.findOne({ schoolCode })
//         if (!schoolExists) {
//             await School.create({
//                 name:       schoolName,
//                 email,
//                 phone:      phone         || '',
//                 address:    schoolAddress || '',
//                 schoolCode
//             })
//         }

//         // ── Create Admin account for this school ────────────────────────────
//         // ✅ Pass PLAIN password — Admin pre-save hook hashes it ONCE
//         // Previously we passed bcrypt(password) and the hook hashed again → double hash → login fail
//         const adminExists = await Admin.findOne({ email, schoolCode })
//         if (!adminExists) {
//             try {
//                 await Admin.create({
//                     fullname,
//                     email,
//                     password,   // ✅ plain — pre-save hook hashes it
//                     role:       'admin',
//                     schoolCode
//                 })
//             } catch (adminErr) {
//                 // Non-fatal — Owner and School already created successfully
//                 // Admin creation may fail if email already exists globally
//                 console.error('Admin auto-create warning:', adminErr.message)
//             }
//         }

//         // ── Send credentials email ──────────────────────────────────────────
//         // Non-blocking — if email fails we still return success with credentials in response
//         const sendCredentials = async () => {
//             try {
//                 // ✅ Port 587 + STARTTLS — more reliable than 465 on Windows/Nigerian ISPs
//                 const transporter = nodemailer.createTransport({
//                     host:   'smtp.gmail.com',
//                     port:    587,
//                     secure:  false,          // false = STARTTLS (upgrades after connect)
//                     auth: {
//                         user: process.env.EMAIL_USER,
//                         pass: process.env.EMAIL_PASS
//                     },
//                     tls: {
//                         rejectUnauthorized: false,
//                         ciphers: 'SSLv3'
//                     }
//                 })

//                 // Verify connection — prints exact error to terminal if credentials/network wrong
//                 const verified = await transporter.verify()
//                 console.log('SMTP connected:', verified)

//                 const sendEmails = async () => {
//                                 try {
//                                     const transporter = nodemailer.createTransport({
//                                         host: 'smtp.gmail.com', port: 587, secure: false,
//                                         auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
//                                         tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
//                                     })

//                                     // Email to owner
//                                     await transporter.sendMail({
//                                         from: `"Edvance Platform" <${process.env.EMAIL_USER}>`,
//                                         to: email,
//                                         subject: `Welcome to Edvance — Your School Credentials`,
//                                         html: `
//                                             <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
//                                                 <h2 style="color:#2563eb;">Welcome, ${fullname}!</h2>
//                                                 <p>Your school <strong>${schoolName}</strong> has been registered on Edvance.</p>
//                                                 <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:20px 0;">
//                                                     <h3 style="margin-top:0;color:#0369a1;">Your Login Credentials</h3>
//                                                     <p>Email: <strong>${email}</strong></p>
//                                                     <p>Password: <strong>${req.body.password}</strong></p>
//                                                     <p>School Code: <strong style="color:#2563eb;font-size:18px;">${owner.schoolCode}</strong></p>
//                                                 </div>
//                                                 <p style="color:#92400e;background:#fef3c7;padding:12px;border-radius:8px;">
//                                                     Share the School Code <strong>${owner.schoolCode}</strong> with your teachers and parents.
//                                                 </p>
//                                             </div>`
//                                     })

//                                     // Email to super admin
//                                     await transporter.sendMail({
//                                         from: `"Edvance Platform" <${process.env.EMAIL_USER}>`,
//                                         to: process.env.SUPER_ADMIN_EMAIL,
//                                         subject: `New School Registered — ${schoolName}`,
//                                         html: `
//                                             <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
//                                                 <h2 style="color:#2563eb;">New School Registered</h2>
//                                                 <p>School: <strong>${schoolName}</strong></p>
//                                                 <p>Owner: <strong>${fullname}</strong></p>
//                                                 <p>Email: <strong>${email}</strong></p>
//                                                 <p>School Code: <strong>${owner.schoolCode}</strong></p>
//                                                 <p>Plan: <strong>${req.body.plan || 'free'}</strong></p>
//                                                 <p>Date: <strong>${new Date().toLocaleString('en-NG')}</strong></p>
//                                             </div>`
//                                     })
//                                     console.log('Emails sent to owner and super admin')
//                                 } catch (err) {
//                                     console.error('Email error:', err.message)
//                                 }
//                             }
//                             sendEmails()

//                             res.status(201).json({
//                                 message: 'Owner account created successfully',
//                                 owner: {
//                                     _id: owner._id,
//                                     fullname: owner.fullname,
//                                     email: owner.email,
//                                     schoolName: owner.schoolName,
//                                     plan: owner.plan,
//                                     role: owner.role
//                                 }
//                             })
//                         } catch (err) {
//                             res.status(500).json({ error: err.message })
//                         }
//                     }

//         // Fire and forget — don't await so response is fast
//         sendCredentials()

//         // ── Return full credentials in response (super admin can see + copy) ─
//         res.status(201).json({
//             message: 'School registered successfully. Credentials emailed to owner.',
//             schoolCode,
//             owner: {
//                 _id:        owner._id,
//                 fullname:   owner.fullname,
//                 email:      owner.email,
//                 schoolName: owner.schoolName,
//                 schoolCode,
//                 plan:       owner.plan,
//                 role:       owner.role
//             }
//         })
//     } catch (err) {
//         console.error('ownerRegister error:', err.message)
//         res.status(500).json({ error: err.message })
//     }
// }
// // ── POST /payroll/test-email ─────────────────────────────────────────────────
// // Temporarily call this to verify nodemailer is working WITHOUT registering a school
// // Remove this route in production
// exports.testEmail = async (req, res) => {
//     try {
//         const transporter = nodemailer.createTransport({
//             host:   'smtp.gmail.com',
//             port:    587,
//             secure:  false,
//             auth: {
//                 user: process.env.EMAIL_USER,
//                 pass: process.env.EMAIL_PASS
//             },
//             tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
//         })

//         await transporter.verify()
//         await transporter.sendMail({
//             from:    process.env.EMAIL_USER,
//             to:      req.body.to || process.env.EMAIL_USER,
//             subject: 'Test Email — School Platform',
//             text:    'If you see this, nodemailer is working correctly.'
//         })

//         res.json({ message: 'Test email sent successfully to ' + (req.body.to || process.env.EMAIL_USER) })
//     } catch (err) {
//         console.error('testEmail error:', err.message)
//         res.status(500).json({ error: err.message })
//     }
// }


const Payroll = require('../models/Payroll')
const Teacher = require('../models/Teachers')
const axios = require('axios')
const nodemailer = require('nodemailer')
const School = require('../models/school')
const Admin = require('../models/admin')

// Generate payroll for all teachers for a given month/year
exports.generatePayroll = async (req, res) => {
    try {
        const month = req.body.month
        const year = req.body.year
        const paidBy = req.body.paidBy || 'Admin'
        // FIX: scope to this school only
        const sc = req.schoolCode

        if (!month || !year) return res.status(400).json({ error: 'Month and year are required' })

        // FIX: only fetch teachers belonging to this school
        const teachers = await Teacher.find({ schoolCode: sc }, 'fullname salary accountNumber bankCode bankName').lean()
        if (!teachers.length) return res.status(404).json({ error: 'No teachers found' })

        const created = []
        const skipped = []

        for (const teacher of teachers) {
            const existing = await Payroll.findOne({ teacherId: teacher._id, month, year, schoolCode: sc })
            if (existing) { skipped.push(teacher.fullname); continue }

            const basicSalary = teacher.salary || 0
            const defaultAllowances = [
                { name: 'Transport', amount: 0 },
                { name: 'Housing', amount: 0 }
            ]
            const defaultDeductions = [
                { name: 'Tax (PAYE)', amount: Math.round(basicSalary * 0.05) },
                { name: 'Pension', amount: Math.round(basicSalary * 0.08) }
            ]
            const totalAllowances = defaultAllowances.reduce((s, a) => s + a.amount, 0)
            const totalDeductions = defaultDeductions.reduce((s, d) => s + d.amount, 0)
            const grossPay = basicSalary + totalAllowances
            const netPay = grossPay - totalDeductions

            const payroll = await Payroll.create({
                teacherId: teacher._id,
                teacherName: teacher.fullname,
                month, year,
                basicSalary,
                allowances: defaultAllowances,
                deductions: defaultDeductions,
                totalAllowances,
                totalDeductions,
                grossPay,
                netPay,
                status: 'pending',
                paidBy,
                // FIX: tag payroll record with schoolCode
                schoolCode: sc
            })
            created.push(payroll)
        }

        res.json({
            message: `Payroll generated for ${created.length} teachers. ${skipped.length} already existed.`,
            created, skipped
        })
    } catch (err) {
        console.log('generatePayroll error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Get all payroll records with optional filters
exports.getPayroll = async (req, res) => {
    try {
        const month = req.query.month
        const year = req.query.year
        const status = req.query.status
        // FIX: always scope to this school
        const query = { schoolCode: req.schoolCode }

        if (month) query.month = month
        if (year) query.year = year
        if (status) query.status = status

        const records = await Payroll.find(query).sort({ createdAt: -1 }).lean()

        const totalGross = records.reduce((s, r) => s + r.grossPay, 0)
        const totalNet = records.reduce((s, r) => s + r.netPay, 0)
        const totalPaid = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.netPay, 0)
        const totalPending = records.filter(r => r.status === 'pending').reduce((s, r) => s + r.netPay, 0)

        res.json({ records, summary: { totalGross, totalNet, totalPaid, totalPending, count: records.length } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Update a single payroll record (add allowances/deductions)
exports.updatePayroll = async (req, res) => {
    try {
        const { id } = req.params
        const { allowances, deductions, note } = req.body

        const payroll = await Payroll.findOne({ _id: id, schoolCode: req.schoolCode })
        if (!payroll) return res.status(404).json({ error: 'Payroll record not found' })
        if (payroll.status === 'paid') return res.status(400).json({ error: 'Cannot edit a paid payroll' })

        if (allowances) payroll.allowances = allowances
        if (deductions) payroll.deductions = deductions
        if (note !== undefined) payroll.note = note

        payroll.totalAllowances = payroll.allowances.reduce((s, a) => s + (a.amount || 0), 0)
        payroll.totalDeductions = payroll.deductions.reduce((s, d) => s + (d.amount || 0), 0)
        payroll.grossPay = payroll.basicSalary + payroll.totalAllowances
        payroll.netPay = payroll.grossPay - payroll.totalDeductions

        await payroll.save()
        res.json(payroll)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Pay a teacher via Flutterwave transfer
exports.payTeacher = async (req, res) => {
    try {
        const { id } = req.params
        // FIX: scope payroll lookup to this school
        const payroll = await Payroll.findOne({ _id: id, schoolCode: req.schoolCode })
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' })
        if (payroll.status === 'paid') return res.status(400).json({ error: 'Already paid' })

        const teacher = await Teacher.findOne({ _id: payroll.teacherId, schoolCode: req.schoolCode }).lean()
        if (!teacher?.accountNumber || !teacher?.bankCode)
            return res.status(400).json({ error: 'Teacher bank details incomplete' })

        const txRef = `PAYROLL-${payroll._id}-${Date.now()}`

        const response = await axios.post(
            'https://api.flutterwave.com/v3/transfers',
            {
                account_bank: teacher.bankCode,
                account_number: teacher.accountNumber,
                amount: payroll.netPay,
                currency: 'NGN',
                reference: txRef,
                narration: `${payroll.month} ${payroll.year} Salary - ${teacher.fullname}`,
                callback_url: `${process.env.BACKEND_URL}/payroll/verify/${payroll._id}`
            },
            { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` } }
        )

        if (response.data.status === 'success') {
            payroll.status = 'paid'
            payroll.txRef = txRef
            payroll.flwRef = response.data.data?.id?.toString()
            payroll.paidAt = new Date()
            await payroll.save()
            res.json({ message: 'Payment initiated successfully', data: response.data })
        } else {
            res.status(400).json({ error: 'Payment failed', details: response.data })
        }
    } catch (err) {
        console.log('payTeacher error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Mark as paid manually (cash payment)
exports.markAsPaid = async (req, res) => {
    try {
        const { id } = req.params
        // FIX: scope to this school
        const payroll = await Payroll.findOne({ _id: id, schoolCode: req.schoolCode })
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' })
        if (payroll.status === 'paid') return res.status(400).json({ error: 'Already paid' })

        payroll.status = 'paid'
        payroll.paymentMethod = 'cash'
        payroll.paidAt = new Date()
        await payroll.save()
        res.json({ message: 'Marked as paid', payroll })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Owner dashboard stats
exports.getOwnerStats = async (req, res) => {
    try {
        const Student = require('../models/student')
        const Teacher = require('../models/Teachers')
        const Parent = require('../models/parent')
        const Fee = require('../models/fee')
        const Attendance = require('../models/Attendance')

        // FIX: scope ALL queries to this school — was fetching all schools' data
        const sc = req.schoolCode
        if (!sc) return res.status(400).json({ error: 'No school code on request' })

        const currentYear = new Date().getFullYear().toString()
        const currentMonth = new Date().toLocaleString('en-NG', { month: 'long' })

        const [totalStudents, totalTeachers, totalParents] = await Promise.all([
            Student.countDocuments({ schoolCode: sc }),
            Teacher.countDocuments({ schoolCode: sc }),
            Parent.countDocuments({ schoolCode: sc }),
        ])

        // FIX: filter fees by schoolCode
        const allFees = await Fee.find({ schoolCode: sc }).lean()
        const totalFeesCollected = allFees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
        const totalFeesPending = allFees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
        const feeCollectionRate = allFees.length > 0
            ? Math.round(allFees.filter(f => f.status === 'paid').length / allFees.length * 100)
            : 0

        // FIX: filter payroll by schoolCode
        const payrollRecords = await Payroll.find({ month: currentMonth, year: currentYear, schoolCode: sc }).lean()
        const totalPayrollPaid = payrollRecords.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPay, 0)
        const totalPayrollPending = payrollRecords.filter(p => p.status === 'pending').reduce((s, p) => s + p.netPay, 0)

        // Monthly fee collection for last 6 months — scoped to this school
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setDate(1)
            d.setMonth(d.getMonth() - i)
            months.push({
                month: d.toLocaleString('en-NG', { month: 'short' }),
                year: d.getFullYear(),
                monthIndex: d.getMonth()
            })
        }

        const monthlyRevenue = await Promise.all(months.map(async ({ month, year, monthIndex }) => {
            const start = new Date(year, monthIndex, 1)
            const end = new Date(year, monthIndex + 1, 1)
            // FIX: include schoolCode filter
            const fees = await Fee.find({
                schoolCode: sc,
                status: 'paid',
                paidAt: { $gte: start, $lt: end }
            }).lean()
            return { month, amount: fees.reduce((s, f) => s + f.amount, 0) }
        }))

        // FIX: filter attendance by schoolCode
        const attendanceRecords = await Attendance.find({ schoolCode: sc }).lean()
        const totalAttendance = attendanceRecords.length
        const presentCount = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length
        const overallAttendanceRate = totalAttendance > 0 ? Math.round(presentCount / totalAttendance * 100) : 0

        // FIX: filter recent payments by schoolCode
        const recentPayments = await Fee.find({ schoolCode: sc, status: 'paid' })
            .sort({ paidAt: -1 })
            .limit(5)
            .lean()

        res.json({
            totalStudents, totalTeachers, totalParents,
            totalFeesCollected, totalFeesPending, feeCollectionRate,
            totalPayrollPaid, totalPayrollPending,
            monthlyRevenue,
            overallAttendanceRate,
            recentPayments,
            currentMonth, currentYear
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Owner login
exports.ownerLogin = async (req, res) => {
    try {
        const bcrypt = require('bcrypt')
        const jwt = require('jsonwebtoken')
        const Owner = require('../models/Owner')

        const { email, password } = req.body

        const owner = await Owner.findOne({ email })
        if (!owner) return res.status(404).json({ error: 'Owner account not found' })

        if (owner.isActive === false)
            return res.status(403).json({ error: 'Your school account has been deactivated. Contact support.' })

        const isMatch = await bcrypt.compare(password, owner.password)
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })

        const token = jwt.sign(
            { id: owner._id, role: 'owner', schoolCode: owner.schoolCode },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '7d' }
        )

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        })

        res.json({
            token,
            user: {
                id: owner._id,
                fullname: owner.fullname,
                email: owner.email,
                schoolName: owner.schoolName,
                schoolCode: owner.schoolCode,
                schoolAddress: owner.schoolAddress || '',
                plan: owner.plan,
                role: 'owner',
                isActive: owner.isActive
            }
        })
    } catch (err) {
        console.error('ownerLogin error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Owner register
exports.ownerRegister = async (req, res) => {
    try {
        const bcrypt = require('bcrypt')
        const Owner = require('../models/Owner')
        const { fullname, email, password, phone, schoolName, schoolAddress, plan } = req.body

        if (!fullname || !email || !password || !schoolName)
            return res.status(400).json({ error: 'fullname, email, password and schoolName are required' })

        const exists = await Owner.findOne({ email })
        if (exists) return res.status(400).json({ error: 'Email already registered' })

        const generateCode = () => Math.random().toString(36).substring(2, 10).toUpperCase()
        let schoolCode = generateCode()
        while (await Owner.findOne({ schoolCode })) schoolCode = generateCode()

        const hashedOwner = await bcrypt.hash(password, 10)
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 90)

        const owner = await Owner.create({
            fullname,
            email,
            password: hashedOwner,
            phone: phone || '',
            schoolName,
            schoolAddress: schoolAddress || '',
            schoolCode,
            plan: 'trial',         // ✅ all new schools start on trial
            trialStartDate: new Date(),
            trialEndDate,                    // ✅ expires in 90 days
            role: 'owner',
            isActive: true
        })

        const schoolExists = await School.findOne({ schoolCode })
        if (!schoolExists) {
            await School.create({
                name: schoolName,
                email,
                phone: phone || '',
                address: schoolAddress || '',
                schoolCode
            })
        }

        const adminExists = await Admin.findOne({ email, schoolCode })
        if (!adminExists) {
            try {
                await Admin.create({
                    fullname,
                    email,
                    password,
                    role: 'admin',
                    schoolCode
                })
            } catch (adminErr) {
                console.error('Admin auto-create warning:', adminErr.message)
            }
        }

        const sendEmails = async () => {
            try {
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com', port: 587, secure: false,
                    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
                    tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
                })

                await transporter.sendMail({
                    from: `"Edvance Platform" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: `Welcome to Edvance — Your School Credentials`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                            <h2 style="color:#2563eb;">Welcome, ${fullname}!</h2>
                            <p>Your school <strong>${schoolName}</strong> has been registered on Edvance.</p>
                            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin:20px 0;">
                                <h3 style="margin-top:0;color:#0369a1;">Your Login Credentials</h3>
                                <p>Email: <strong>${email}</strong></p>
                                <p>Password: <strong>${password}</strong></p>
                                <p>School Code: <strong style="color:#2563eb;font-size:18px;">${schoolCode}</strong></p>
                            </div>
                            <p style="color:#92400e;background:#fef3c7;padding:12px;border-radius:8px;">
                                Share the School Code <strong>${schoolCode}</strong> with your teachers and parents.
                            </p>
                        </div>`
                })

                await transporter.sendMail({
                    from: `"Edvance Platform" <${process.env.EMAIL_USER}>`,
                    to: process.env.SUPER_ADMIN_EMAIL,
                    subject: `New School Registered — ${schoolName}`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                            <h2 style="color:#2563eb;">New School Registered</h2>
                            <p>School: <strong>${schoolName}</strong></p>
                            <p>Owner: <strong>${fullname}</strong></p>
                            <p>Email: <strong>${email}</strong></p>
                            <p>School Code: <strong>${schoolCode}</strong></p>
                            <p>Plan: <strong>${plan || 'free'}</strong></p>
                            <p>Date: <strong>${new Date().toLocaleString('en-NG')}</strong></p>
                        </div>`
                })
                console.log('Emails sent to owner and super admin')
            } catch (err) {
                console.error('Email error:', err.message)
            }
        }
        sendEmails()

        res.status(201).json({
            message: 'School registered successfully. Credentials emailed to owner.',
            schoolCode,
            owner: {
                _id: owner._id,
                fullname: owner.fullname,
                email: owner.email,
                schoolName: owner.schoolName,
                schoolCode,
                plan: owner.plan,
                role: owner.role
            }
        })
    } catch (err) {
        console.error('ownerRegister error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Test email endpoint
exports.testEmail = async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com', port: 587, secure: false,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
        })
        await transporter.verify()
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: req.body.to || process.env.EMAIL_USER,
            subject: 'Test Email — School Platform',
            text: 'If you see this, nodemailer is working correctly.'
        })
        res.json({ message: 'Test email sent successfully to ' + (req.body.to || process.env.EMAIL_USER) })
    } catch (err) {
        console.error('testEmail error:', err.message)
        res.status(500).json({ error: err.message })
    }
}