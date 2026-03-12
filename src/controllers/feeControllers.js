const Fee = require('../models/Fee')
const Student = require('../models/student')
const axios = require('axios')

// Get all fees (admin view)
exports.admin_fee_get = async (req, res) => {
    try {
        const fees = await Fee.find().sort({ createdAt: -1 })
        res.json(fees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}
// Get fees for a specific student
exports.get_fee_perStudent  = async (req, res) => {
    try {
        const fees = await Fee.find({ studentId: req.params.studentId }).sort({ createdAt: -1 })
        res.json(fees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Get fees summary (for pie chart in admin dashboard)
exports.get_summary =  async (req, res) => {
    try {
        const paid = await Fee.countDocuments({ status: 'paid' })
        const pending = await Fee.countDocuments({ status: 'pending' })
        const overdue = await Fee.countDocuments({ status: 'overdue' })
        const totalCollected = await Fee.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
        res.json({
            paid, pending, overdue,
            totalCollected: totalCollected[0]?.total || 0
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin creates fee manually for a student
exports.post_admin_fee =  async (req, res) => {
    console.log('fee')
    try {
        const { studentId, term, amount, dueDate } = req.body
        const student = await Student.findById(studentId)
        if (!student) return res.status(404).json({ error: 'Student not found' })

        const fee = await Fee.create({
            studentId,
            studentName: student.fullname,
            studentClass: student.studentClass,
            term,
            amount,
            dueDate,
            status: 'pending'
        })
        res.json(fee)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Auto-generate fees for ALL students when a new term starts
exports.post_autoGenarate_fee= async (req, res) => {
    try {
        const { term, amount, dueDate } = req.body
        const students = await Student.find()

        const fees = await Promise.all(
            students.map(student =>
                Fee.create({
                    studentId: student._id,
                    studentName: student.fullname,
                    studentClass: student.studentClass,
                    term,
                    amount,
                    dueDate,
                    status: 'pending'
                })
            )
        )
        res.json({ message: `${fees.length} fee records created`, fees })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin updates fee (mark as paid, change amount etc)
exports.put_adminBtn_change =  async (req, res) => {
    try {
        const updated = await Fee.findByIdAndUpdate(
            req.params.id,
            { ...req.body, ...(req.body.status === 'paid' ? { paidDate: new Date() } : {}) },
            { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


// Admin deletes a fee record
exports.admin_delete =  async (req, res) => {
    try {
        await Fee.findByIdAndDelete(req.params.id)
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}


// ============ PAYSTACK PAYMENT ROUTES ============

// Step 1: Parent initiates payment — Paystack returns an authorization URL
exports.post_paystack =  async (req, res) => {
    try {
        const { feeId, email, amount } = req.body

        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email,
                amount: amount * 100, // Paystack uses kobo (multiply by 100)
                metadata: { feeId }, // pass feeId so we can verify later
                callback_url: `http://localhost:3000/parent/fees/verify` // redirect after payment
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        res.json({
            authorizationUrl: response.data.data.authorization_url,
            reference: response.data.data.reference
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Step 2: Verify payment after Paystack redirects back
exports.get_paystack =  async (req, res) => {
    try {
        const { reference } = req.params

        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
            }
        )

        const { status, metadata } = response.data.data

        if (status === 'success') {
            // mark the fee as paid in DB
            const fee = await Fee.findByIdAndUpdate(
                metadata.feeId,
                {
                    status: 'paid',
                    paidDate: new Date(),
                    paystackReference: reference
                },
                { new: true }
            )
            res.json({ message: 'Payment verified', fee })
        } else {
            res.status(400).json({ error: 'Payment not successful' })
        }
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}






















