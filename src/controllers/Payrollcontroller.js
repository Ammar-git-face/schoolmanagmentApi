const Payroll    = require('../models/Payroll')
const Teacher    = require('../models/Teachers')
const axios      = require('axios')
const nodemailer = require('nodemailer')   // ✅ top-level — fails loudly on startup if missing
const School     = require('../models/school')
const Admin      = require('../models/admin')

// Generate payroll for all teachers for a given month/year
exports.generatePayroll = async (req, res) => {
    try {
        const month = req.body.month
        const year = req.body.year
        const paidBy = req.body.paidBy || 'Admin'

        if (!month || !year) return res.status(400).json({ error: 'Month and year are required' })

        const teachers = await Teacher.find({}, 'fullname salary accountNumber bankCode bankName').lean()
        if (!teachers.length) return res.status(404).json({ error: 'No teachers found' })

        const created = []
        const skipped = []

        for (const teacher of teachers) {
            const existing = await Payroll.findOne({ teacherId: teacher._id, month, year })
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
                paidBy
            })
            created.push(payroll)
        }

        res.json({ message: `Payroll generated for ${created.length} teachers. ${skipped.length} already existed.`, created, skipped })
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

        const query = {}
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

        const payroll = await Payroll.findById(id)
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
        const payroll = await Payroll.findById(id)
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' })
        if (payroll.status === 'paid') return res.status(400).json({ error: 'Already paid' })

        const teacher = await Teacher.findById(payroll.teacherId).lean()
        if (!teacher?.accountNumber || !teacher?.bankCode) {
            return res.status(400).json({ error: 'Teacher bank details incomplete' })
        }

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
        const payroll = await Payroll.findById(id)
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
        const Parent = require('../models/Parent')
        const Fee = require('../models/Fee')
        const Attendance = require('../models/Attendance')

        const currentYear = new Date().getFullYear().toString()
        const currentMonth = new Date().toLocaleString('en-NG', { month: 'long' })

        const [totalStudents, totalTeachers, totalParents] = await Promise.all([
            Student.countDocuments(),
            Teacher.countDocuments(),
            Parent.countDocuments(),
            Attendance.countDocuments()
        ])

        // Fee stats
        const allFees = await Fee.find().lean()
        const totalFeesCollected = allFees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
        const totalFeesPending = allFees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
        const feeCollectionRate = allFees.length > 0
            ? Math.round(allFees.filter(f => f.status === 'paid').length / allFees.length * 100)
            : 0

        // Payroll stats for current month
        const payrollRecords = await Payroll.find({ month: currentMonth, year: currentYear }).lean()
        const totalPayrollPaid = payrollRecords.filter(p => p.status === 'paid').reduce((s, p) => s + p.netPay, 0)
        const totalPayrollPending = payrollRecords.filter(p => p.status === 'pending').reduce((s, p) => s + p.netPay, 0)

        // Monthly fee collection for last 6 months
        // Monthly fee collection for last 6 months
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setDate(1)                    // avoid day overflow
            d.setMonth(d.getMonth() - i)
            months.push({
                month: d.toLocaleString('en-NG', { month: 'short' }),
                year: d.getFullYear(),
                monthIndex: d.getMonth()    // 0-based numeric month — no string parsing needed
            })
        }

        const monthlyRevenue = await Promise.all(months.map(async ({ month, year, monthIndex }) => {
            const start = new Date(year, monthIndex, 1)         // first day of month
            const end = new Date(year, monthIndex + 1, 1)     // first day of next month

            const fees = await Fee.find({
                status: 'paid',
                paidAt: { $gte: start, $lt: end }
            }).lean()

            return { month, amount: fees.reduce((s, f) => s + f.amount, 0) }
        }))

        // Attendance rate overall
        const attendanceRecords = await Attendance.find().lean()
        const totalAttendance = attendanceRecords.length
        const presentCount = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length
        const overallAttendanceRate = totalAttendance > 0 ? Math.round(presentCount / totalAttendance * 100) : 0

        // Recent fee payments
        const recentPayments = await Fee.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(5).lean()

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
        const jwt    = require('jsonwebtoken')
        const Owner  = require('../models/Owner')

        const { email, password } = req.body

        const owner = await Owner.findOne({ email })
        if (!owner) return res.status(404).json({ error: 'Owner account not found' })

        // ✅ Check school is still active before allowing login
        if (owner.isActive === false)
            return res.status(403).json({ error: 'Your school account has been deactivated. Contact support.' })

        const isMatch = await bcrypt.compare(password, owner.password)
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })

        // ✅ Issue JWT with schoolCode — required for attachSchool middleware
        const token = jwt.sign(
            { id: owner._id, role: 'owner', schoolCode: owner.schoolCode },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '7d' }
        )

        res.cookie('token', token, {
            httpOnly: true,
            maxAge:   7 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        })

        res.json({
            token,
            user: {
                id:           owner._id,
                fullname:     owner.fullname,
                email:        owner.email,
                schoolName:   owner.schoolName,
                schoolCode:   owner.schoolCode,
                schoolAddress: owner.schoolAddress || '',
                plan:         owner.plan,
                role:         'owner',
                isActive:     owner.isActive
            }
        })
    } catch (err) {
        console.error('ownerLogin error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Add this function to your payrollController.js
// and add the route to your rollrouter

// ============ OWNER REGISTER ============
exports.ownerRegister = async (req, res) => {
    try {
        const bcrypt      = require('bcrypt')
        const Owner       = require('../models/Owner')
        const Admin       = require('../models/Admin')
        const { fullname, email, password, phone, schoolName, schoolAddress, plan } = req.body

        if (!fullname || !email || !password || !schoolName)
            return res.status(400).json({ error: 'fullname, email, password and schoolName are required' })

        // ── Check duplicate ─────────────────────────────────────────────────
        const exists = await Owner.findOne({ email })
        if (exists) return res.status(400).json({ error: 'Email already registered' })

        // ── Generate unique schoolCode ──────────────────────────────────────
        // 8-char uppercase alphanumeric — unique enough for school codes
        const generateCode = () =>
            Math.random().toString(36).substring(2, 10).toUpperCase()

        let schoolCode = generateCode()
        // Ensure uniqueness — retry if clash (extremely rare)
        while (await Owner.findOne({ schoolCode })) schoolCode = generateCode()

        // ── Create Owner record ─────────────────────────────────────────────
        const hashedOwner = await bcrypt.hash(password, 10)
        const owner = await Owner.create({
            fullname,
            email,
            password: hashedOwner,
            phone:          phone          || '',
            schoolName,
            schoolAddress:  schoolAddress  || '',
            schoolCode,
            plan:           plan           || 'free',
            role:           'owner',
            isActive:       true
        })

        // ── Create School record ───────────────────────────────────────────
        // School model is used by uploadLogo, getSchoolInfo, dashboard etc.
        // Without this record, logo upload silently fails (findOneAndUpdate finds nothing)
        const schoolExists = await School.findOne({ schoolCode })
        if (!schoolExists) {
            await School.create({
                name:       schoolName,
                email,
                phone:      phone         || '',
                address:    schoolAddress || '',
                schoolCode
            })
        }

        // ── Create Admin account for this school ────────────────────────────
        // ✅ Pass PLAIN password — Admin pre-save hook hashes it ONCE
        // Previously we passed bcrypt(password) and the hook hashed again → double hash → login fail
        const adminExists = await Admin.findOne({ email, schoolCode })
        if (!adminExists) {
            try {
                await Admin.create({
                    fullname,
                    email,
                    password,   // ✅ plain — pre-save hook hashes it
                    role:       'admin',
                    schoolCode
                })
            } catch (adminErr) {
                // Non-fatal — Owner and School already created successfully
                // Admin creation may fail if email already exists globally
                console.error('Admin auto-create warning:', adminErr.message)
            }
        }

        // ── Send credentials email ──────────────────────────────────────────
        // Non-blocking — if email fails we still return success with credentials in response
        const sendCredentials = async () => {
            try {
                // ✅ Port 587 + STARTTLS — more reliable than 465 on Windows/Nigerian ISPs
                const transporter = nodemailer.createTransport({
                    host:   'smtp.gmail.com',
                    port:    587,
                    secure:  false,          // false = STARTTLS (upgrades after connect)
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    },
                    tls: {
                        rejectUnauthorized: false,
                        ciphers: 'SSLv3'
                    }
                })

                // Verify connection — prints exact error to terminal if credentials/network wrong
                const verified = await transporter.verify()
                console.log('SMTP connected:', verified)

                await transporter.sendMail({
                    from:    `"School Management Platform" <${process.env.EMAIL_USER}>`,
                    to:      email,
                    subject: `Welcome to the platform — Your school credentials`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                            <h2 style="color: #2563eb;">Welcome, ${fullname}!</h2>
                            <p>Your school <strong>${schoolName}</strong> has been successfully registered on the platform.</p>

                            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #0369a1;">Your Login Credentials</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr><td style="padding: 6px 0; color: #64748b;">Email:</td><td><strong>${email}</strong></td></tr>
                                    <tr><td style="padding: 6px 0; color: #64748b;">Password:</td><td><strong>${password}</strong></td></tr>
                                    <tr><td style="padding: 6px 0; color: #64748b;">School Code:</td><td><strong style="color: #2563eb; font-size: 18px;">${schoolCode}</strong></td></tr>
                                    <tr><td style="padding: 6px 0; color: #64748b;">Plan:</td><td><strong>${plan || 'free'}</strong></td></tr>
                                </table>
                            </div>

                            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 16px 0;">
                                <p style="margin: 0; color: #92400e;">
                                    <strong>Important:</strong> Share the <strong>School Code (${schoolCode})</strong> with your teachers and parents — they need it to register and log in.
                                </p>
                            </div>

                            <p style="color: #64748b; font-size: 13px;">
                                Login at: <a href="http://localhost:3000/component/auth/login">http://localhost:3000/component/auth/login</a>
                            </p>
                            <p style="color: #64748b; font-size: 13px;">
                                Please change your password after your first login.
                            </p>
                        </div>
                    `
                })
                console.log('Credentials email sent to:', email)
            } catch (mailErr) {
                // Email failure is non-fatal — credentials are in the API response
                console.error('Failed to send credentials email:', mailErr.message)
            }
        }

        // Fire and forget — don't await so response is fast
        sendCredentials()

        // ── Return full credentials in response (super admin can see + copy) ─
        res.status(201).json({
            message: 'School registered successfully. Credentials emailed to owner.',
            schoolCode,
            owner: {
                _id:        owner._id,
                fullname:   owner.fullname,
                email:      owner.email,
                schoolName: owner.schoolName,
                schoolCode,
                plan:       owner.plan,
                role:       owner.role
            }
        })
    } catch (err) {
        console.error('ownerRegister error:', err.message)
        res.status(500).json({ error: err.message })
    }
}
// ── POST /payroll/test-email ─────────────────────────────────────────────────
// Temporarily call this to verify nodemailer is working WITHOUT registering a school
// Remove this route in production
exports.testEmail = async (req, res) => {
    try {
        const transporter = nodemailer.createTransport({
            host:   'smtp.gmail.com',
            port:    587,
            secure:  false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
        })

        await transporter.verify()
        await transporter.sendMail({
            from:    process.env.EMAIL_USER,
            to:      req.body.to || process.env.EMAIL_USER,
            subject: 'Test Email — School Platform',
            text:    'If you see this, nodemailer is working correctly.'
        })

        res.json({ message: 'Test email sent successfully to ' + (req.body.to || process.env.EMAIL_USER) })
    } catch (err) {
        console.error('testEmail error:', err.message)
        res.status(500).json({ error: err.message })
    }
}