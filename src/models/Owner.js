const mongoose = require('mongoose')

const ownerSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    schoolName: { type: String, required: true },
    schoolAddress: { type: String },
    schoolCode: { type: String, required: true, index: true } ,
    schoolLogo: { type: String },
    role: { type: String, default: 'owner' },
    plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
    planExpiry: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

module.exports = mongoose.models.Owner || mongoose.model('Owner', ownerSchema)