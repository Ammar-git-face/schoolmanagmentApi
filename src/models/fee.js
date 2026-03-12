const mongoose = require('mongoose')

const feeSchema = new mongoose.Schema({
    parentId: { type: String, required: true },
    parentName: { type: String },
    studentId: { type: String, required: true },
    studentName: { type: String },
    studentClass: { type: String },
    amount: { type: Number, required: true },
    term: { type: String, required: true },
    schoolCode: { type: String, required: true, index: true } ,
    session: { type: String },
    description: { type: String },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    txRef: { type: String },
    flwRef: { type: String },
    paidAt: { type: Date }
}, { timestamps: true })

module.exports = mongoose.models.Fee || mongoose.model('Fee', feeSchema)