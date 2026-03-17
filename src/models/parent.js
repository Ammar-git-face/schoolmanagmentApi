const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const parentSchema = new mongoose.Schema({
    fullname: String,
    email: { type: String, unique: true },
    schoolCode: { type: String, required: true, index: true },
    password: String,
    role: { type: String, default: 'parent' },
    familyCode: String,
}, { timestamps: true })

// ✅ pre-save hook was missing — passwords were stored as plain text
parentSchema.pre('save', async function (next) {
    if (!this.password || !this.isModified('password')) return
    this.password = await bcrypt.hash(this.password, 10)
})

module.exports = mongoose.models.Parent || mongoose.model('Parent', parentSchema)