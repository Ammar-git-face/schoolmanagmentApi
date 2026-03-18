// const Fee = require('../models/fee')
// const axios = require('axios')

// const FLW_SECRET = process.env.FLW_SECRET_KEY
// const FLW_PUBLIC = process.env.FLW_PUBLIC_KEY

// // Create fee record
// exports.create_fee = async (req, res) => {
//     try {
//         const fee = await Fee.create({ ...req.body, status: "pending" })
//         res.status(201).json(fee)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Save txRef to fee record
// exports.initialize_payment = async (req, res) => {
//     try {
//         const { feeId, txRef } = req.body
//         await Fee.findByIdAndUpdate(feeId, { txRef })
//         res.json({ success: true })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Verify payment and mark as paid
// exports.verify_payment = async (req, res) => {
//     try {
//         const { txRef, feeId } = req.body

//         const response = await axios.get(
//             `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${txRef}`,
//             { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
//         )

//         const data = response.data.data
//         if (data.status === "successful") {
//             await Fee.findByIdAndUpdate(feeId, {
//                 status: "paid",
//                 paidAt: new Date(),
//                 flwRef: data.flw_ref
//             })
//             return res.json({ message: "Payment verified and marked as paid" })
//         }

//         res.status(400).json({ error: "Payment not successful" })
//     } catch (err) {
//         console.log("Verify error:", err.response?.data || err.message)
//         res.status(500).json({ error: err.response?.data?.message || err.message })
//     }
// }

// // Get fees by parent
// exports.get_fees_by_parent = async (req, res) => {
//     try {
//         const fees = await Fee.find({ parentId: req.params.parentId }).sort({ createdAt: -1 })
//         res.json(fees)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Get all fees (admin)
// exports.get_all_fees = async (req, res) => {
//     try {
//         const fees = await Fee.find().sort({ createdAt: -1 })
//         res.json(fees)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Pay teacher salary via Flutterwave Transfer
// exports.pay_teacher_salary = async (req, res) => {
//     try {
//         const teacherId = req.body.teacherId
//         const teacherName = req.body.teacherName
//         const accountNumber = req.body.accountNumber
//         const bankCode = req.body.bankCode
//         const amount = req.body.amount
//         const narration = req.body.narration || ("Salary payment for " + teacherName)

//         console.log("Transfer payload:", { accountNumber, bankCode, amount })

//         const response = await axios.post(
//             "https://api.flutterwave.com/v3/transfers",
//             {
//                 account_bank: bankCode,
//                 account_number: accountNumber,
//                 amount: amount,
//                 narration: narration,
//                 currency: "NGN",
//                 reference: "SAL-" + teacherId + "-" + Date.now(),
//                 debit_currency: "NGN"
//             },
//             { headers: { Authorization: "Bearer " + FLW_SECRET } }
//         )

//         console.log("FLW Transfer response:", response.data)

//         if (response.data.status === "success") {
//             const Teacher = require('../models/Teachers')
//             await Teacher.findByIdAndUpdate(teacherId, {
//                 paid: "paid",
//                 lastPaidAt: new Date(),
//                 lastPaidAmount: amount
//             })
//             return res.json({ message: "Salary transfer initiated successfully" })
//         }

//         res.status(400).json({ error: "Transfer failed", details: response.data })
//     } catch (err) {
//         console.log("Salary transfer error:", err.response?.data || err.message)
//         res.status(500).json({ error: err.response?.data?.message || err.message })
//     }
// }

// // Get list of Nigerian banks from Flutterwave
// exports.get_banks = async (req, res) => {
//     try {
//         const response = await axios.get(
//             "https://api.flutterwave.com/v3/banks/NG",
//             { headers: { Authorization: "Bearer " + FLW_SECRET } }
//         )
//         res.json(response.data.data)
//     } catch (err) {
//         console.log("Get banks error:", err.response?.data || err.message)
//         res.status(500).json({ error: err.message })
//     }
// }
const Fee   = require('../models/fee')
const Owner = require('../models/Owner')
const axios = require('axios')

const FLW_SECRET = process.env.FLW_SECRET_KEY
const FLW_PUBLIC = process.env.FLW_PUBLIC_KEY

// ── Create fee record ────────────────────────────────────────────────────────
exports.create_fee = async (req, res) => {
    try {
        const fee = await Fee.create({ ...req.body, status: "pending" })
        res.status(201).json(fee)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── Save txRef to fee record ─────────────────────────────────────────────────
exports.initialize_payment = async (req, res) => {
    try {
        const { feeId, txRef } = req.body
        await Fee.findByIdAndUpdate(feeId, { txRef })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── Verify payment and mark as paid ─────────────────────────────────────────
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

// ── Get fees by parent ───────────────────────────────────────────────────────
exports.get_fees_by_parent = async (req, res) => {
    try {
        const fees = await Fee.find({ parentId: req.params.parentId }).sort({ createdAt: -1 })
        res.json(fees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── Get all fees (admin) ─────────────────────────────────────────────────────
exports.get_all_fees = async (req, res) => {
    try {
        const fees = await Fee.find().sort({ createdAt: -1 })
        res.json(fees)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── Save bank details + auto-create Flutterwave subaccount ──────────────────
// Called from Settings → Payment Details section
// schoolCode from req.schoolCode (attachSchool middleware) — zero conflict between schools
exports.save_bank_details = async (req, res) => {
    try {
        const { accountNumber, bankCode, bankName, accountName } = req.body
        const schoolCode = req.schoolCode

        if (!accountNumber || !bankCode || !bankName || !accountName)
            return res.status(400).json({ error: "All bank details are required" })

        const owner = await Owner.findOne({ schoolCode })
        if (!owner) return res.status(404).json({ error: "School not found" })

        // Go straight to subaccount creation — Flutterwave verifies account internally
        const flwResponse = await axios.post(
            "https://api.flutterwave.com/v3/subaccounts",
            {
                account_bank:            bankCode,
                account_number:          accountNumber,
                business_name:           owner.schoolName,
                business_email:          owner.email,
                business_contact:        owner.fullname,
                business_contact_mobile: owner.phone || "08000000000",
                business_mobile:         owner.phone || "08000000000",
                country:                 "NG",
                split_type:              "percentage",
                split_value:             0.98,
                meta: [{ meta_name: "schoolCode", meta_value: schoolCode }]
            },
            { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        )

        console.log("FLW subaccount response:", JSON.stringify(flwResponse.data, null, 2))

        if (flwResponse.data.status !== "success")
            return res.status(400).json({
                error: flwResponse.data.message || "Payment account setup failed"
            })

        const subaccountId   = flwResponse.data.data.subaccount_id
        const verifiedName   = flwResponse.data.data.account_name || accountName

        await Owner.findOneAndUpdate(
            { schoolCode },
            {
                bankDetails: { accountNumber, bankCode, bankName, accountName: verifiedName },
                flutterwaveSubaccountId: subaccountId
            }
        )

        res.json({
            message:    "Bank details saved and payment account created successfully",
            accountName: verifiedName,
            subaccountId
        })
    } catch (err) {
        console.log("Save bank details error:", JSON.stringify(err.response?.data, null, 2))
        res.status(500).json({ error: err.response?.data?.message || err.message })
    }
}

exports.resolve_account = async (req, res) => {
    try {
        const { accountNumber, bankCode } = req.body
        const response = await axios.get(
            `https://api.flutterwave.com/v3/accounts/resolve`,
            {
                params:  { account_number: accountNumber, account_bank: bankCode },
                headers: { Authorization: `Bearer ${FLW_SECRET}` }
            }
        )
        if (response.data.status !== "success")
            return res.status(400).json({ error: "Could not verify account" })
        res.json({ accountName: response.data.data.account_name })
    } catch (err) {
        res.status(500).json({ error: err.response?.data?.message || err.message })
    }
}
// ── Get saved bank details for settings page ─────────────────────────────────
exports.get_bank_details = async (req, res) => {
    try {
        const owner = await Owner.findOne(
            { schoolCode: req.schoolCode },
            'bankDetails flutterwaveSubaccountId'
        ).lean()
        if (!owner) return res.status(404).json({ error: "School not found" })
        res.json({
            bankDetails:             owner.bankDetails || {},
            flutterwaveSubaccountId: owner.flutterwaveSubaccountId || "",
            isConfigured:            !!owner.flutterwaveSubaccountId
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ── Pay teacher salary via Flutterwave Transfer ──────────────────────────────
// Debits from school's own subaccount — not your main Flutterwave account
exports.pay_teacher_salary = async (req, res) => {
    try {
        const { teacherId, teacherName, accountNumber, bankCode, amount, narration } = req.body
        const schoolCode = req.schoolCode

        // Fetch school's subaccount — each school pays their own teachers
        const owner = await Owner.findOne({ schoolCode }, 'flutterwaveSubaccountId').lean()
        if (!owner?.flutterwaveSubaccountId)
            return res.status(400).json({
                error: "Payment account not configured. Go to Settings → Payment Details and add your bank account first."
            })

        console.log("Transfer payload:", { accountNumber, bankCode, amount })

        const response = await axios.post(
            "https://api.flutterwave.com/v3/transfers",
            {
                account_bank:     bankCode,
                account_number:   accountNumber,
                amount:           amount,
                narration:        narration || `Salary payment for ${teacherName}`,
                currency:         "NGN",
                reference:        `SAL-${teacherId}-${Date.now()}`,
                debit_currency:   "NGN",
                debit_subaccount: owner.flutterwaveSubaccountId
            },
            { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        )

        console.log("FLW Transfer response:", response.data)

        if (response.data.status === "success") {
            const Teacher = require('../models/Teachers')
            await Teacher.findByIdAndUpdate(teacherId, {
                paid:           "paid",
                lastPaidAt:     new Date(),
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

// ── Get list of Nigerian banks from Flutterwave ──────────────────────────────
exports.get_banks = async (req, res) => {
    try {
        const response = await axios.get(
            "https://api.flutterwave.com/v3/banks/NG",
            { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        )
        res.json(response.data.data)
    } catch (err) {
        console.log("Get banks error:", err.response?.data || err.message)
        res.status(500).json({ error: err.message })
    }
}