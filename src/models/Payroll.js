const mongoose = require('mongoose')

const payrollSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    teacherName: { type: String, required: true },
    month: { type: String, required: true },       // e.g. "January"
    year: { type: String, required: true },         // e.g. "2025"
    basicSalary: { type: Number, required: true },
    schoolCode: { type: String, required: true, index: true } ,
    allowances: [{
        name: { type: String },                     // e.g. "Transport", "Housing"
        amount: { type: Number, default: 0 }
    }],
    deductions: [{
        name: { type: String },                     // e.g. "Tax", "Pension", "Loan"
        amount: { type: Number, default: 0 }
    }],
    totalAllowances: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },         // basicSalary + totalAllowances
    netPay: { type: Number, default: 0 },            // grossPay - totalDeductions
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentMethod: { type: String, enum: ['bank_transfer', 'cash'], default: 'bank_transfer' },
    txRef: { type: String },
    flwRef: { type: String },
    paidAt: { type: Date },
    paidBy: { type: String },
    note: { type: String, default: '' }
}, { timestamps: true })

// prevent duplicate payroll for same teacher same month/year
payrollSchema.index({ teacherId: 1, month: 1, year: 1 }, { unique: true })

module.exports = mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema)