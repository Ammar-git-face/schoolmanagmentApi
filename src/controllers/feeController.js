const Fee = require('../models/Fee')
const axios = require('axios')

const FLW_SECRET = process.env.FLW_SECRET_KEY
const FLW_PUBLIC = process.env.FLW_PUBLIC_KEY

// Create fee record
exports.create_fee = async (req, res) => {
    try {
        const fee = await Fee.create({ ...req.body, status: "pending" })
        res.status(201).json(fee)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Save txRef to fee record
exports.initialize_payment = async (req, res) => {
    try {
        const { feeId, txRef } = req.body
        await Fee.findByIdAndUpdate(feeId, { txRef })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Verify payment and mark as paid
exports.verify_payment = async (req, res) => {
    try {
        const { txRef, feeId } = req.body

        const response = await axios.get(
            `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
            { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        )

        const data = response.data.data
        if (data.status === "successful") {
            await Fee.findByIdAndUpdate(feeId, {
                status: "paid",
                paidAt: new Date(),
                flwRef: data.flw_ref
            })
            return res.json({ message: "Payment verified and marked as paid" })
        }

        res.status(400).json({ error: "Payment not successful" })
    } catch (err) {
        console.log("Verify error:", err.response?.data || err.message)
        res.status(500).json({ error: err.response?.data?.message || err.message })
    }
}

// Get fees by parent
exports.get_fees_by_parent = async (req, res) => {
    try {
        const fees = await Fee.find({ parentId: req.params.parentId }).sort({ createdAt: -1 })
        res.json(fees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Get all fees (admin)
exports.get_all_fees = async (req, res) => {
    try {
        const fees = await Fee.find().sort({ createdAt: -1 })
        res.json(fees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Pay teacher salary via Flutterwave Transfer
exports.pay_teacher_salary = async (req, res) => {
    try {
        const teacherId = req.body.teacherId
        const teacherName = req.body.teacherName
        const accountNumber = req.body.accountNumber
        const bankCode = req.body.bankCode
        const amount = req.body.amount
        const narration = req.body.narration || ("Salary payment for " + teacherName)

        console.log("Transfer payload:", { accountNumber, bankCode, amount })

        const response = await axios.post(
            "https://api.flutterwave.com/v3/transfers",
            {
                account_bank: bankCode,
                account_number: accountNumber,
                amount: amount,
                narration: narration,
                currency: "NGN",
                reference: "SAL-" + teacherId + "-" + Date.now(),
                debit_currency: "NGN"
            },
            { headers: { Authorization: "Bearer " + FLW_SECRET } }
        )

        console.log("FLW Transfer response:", response.data)

        if (response.data.status === "success") {
            const Teacher = require('../models/Teachers')
            await Teacher.findByIdAndUpdate(teacherId, {
                paid: "paid",
                lastPaidAt: new Date(),
                lastPaidAmount: amount
            })
            return res.json({ message: "Salary transfer initiated successfully" })
        }

        res.status(400).json({ error: "Transfer failed", details: response.data })
    } catch (err) {
        console.log("Salary transfer error:", err.response?.data || err.message)
        res.status(500).json({ error: err.response?.data?.message || err.message })
    }
}

// Get list of Nigerian banks from Flutterwave
exports.get_banks = async (req, res) => {
    try {
        const response = await axios.get(
            "https://api.flutterwave.com/v3/banks/NG",
            { headers: { Authorization: "Bearer " + FLW_SECRET } }
        )
        res.json(response.data.data)
    } catch (err) {
        console.log("Get banks error:", err.response?.data || err.message)
        res.status(500).json({ error: err.message })
    }
}