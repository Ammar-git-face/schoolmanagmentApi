// const mongoose = require('mongoose')

// const ownerSchema = new mongoose.Schema({
//     fullname: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     phone: { type: String },
//     schoolName: { type: String, required: true },
//     schoolAddress: { type: String },
//     schoolCode: { type: String, required: true, index: true } ,
//     schoolLogo: { type: String },
//     role: { type: String, default: 'owner' },
//     plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
//     planExpiry: { type: Date },
//     isActive: { type: Boolean, default: true }
// }, { timestamps: true })

// module.exports = mongoose.models.Owner || mongoose.model('Owner', ownerSchema)

const mongoose = require('mongoose')

const ownerSchema = new mongoose.Schema({
    fullname:      { type: String, required: true },
    email:         { type: String, required: true, unique: true },
    password:      { type: String, required: true },
    phone:         { type: String },
    schoolName:    { type: String, required: true },
    schoolAddress: { type: String },
    schoolCode:    { type: String, required: true, index: true },
    schoolLogo:    { type: String },
    role:          { type: String, default: 'owner' },
    plan:          { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
    planExpiry:    { type: Date },
    isActive:      { type: Boolean, default: true },

    // ── Payment settings — saved from settings page, subaccount auto-created ─
    bankDetails: {
        accountNumber: { type: String, default: "" },
        bankCode:      { type: String, default: "" },
        bankName:      { type: String, default: "" },
        accountName:   { type: String, default: "" },
    },
    // Returned by Flutterwave after subaccount creation — used in all payments
    flutterwaveSubaccountId: { type: String, default: "" },

    

    plan:         { type: String, enum: ['free', 'trial', 'premium'], default: 'trial' },
    trialStartDate: { type: Date, default: Date.now },
    trialEndDate:   { type: Date },   // set on register to +90 days
    planExpiry:     { type: Date },   // for premium subscriptions
 
    isActive: { type: Boolean, default: true }
}, { timestamps: true })
 
// Virtual — check if trial is still valid
ownerSchema.virtual('isTrialActive').get(function () {
    if (this.plan !== 'trial') return false
    if (!this.trialEndDate) return true
    return new Date() < this.trialEndDate
})  

module.exports = mongoose.models.Owner || mongoose.model('Owner', ownerSchema)