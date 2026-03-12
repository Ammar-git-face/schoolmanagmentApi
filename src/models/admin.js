const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const adminSchema = new mongoose.Schema({
    fullname: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'admin' },
    schoolCode: { type: String, required: true, index: true }
}, { timestamps: true })

// ✅ No next parameter — promise based
adminSchema.pre('save', async function () {
    if (!this.isModified('password')) return
    this.password = await bcrypt.hash(this.password, 10)
})

// ✅ Reuse existing model if already compiled
module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema)