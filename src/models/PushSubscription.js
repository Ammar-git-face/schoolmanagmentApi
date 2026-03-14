// src/models/PushSubscription.js
const mongoose = require("mongoose")

const pushSubSchema = new mongoose.Schema({
    endpoint:   { type: String, required: true, unique: true },
    subscription: { type: Object, required: true }, // full push subscription object
    userId:     { type: String, index: true },
    role:       { type: String, enum: ["admin", "teacher", "parent", "owner"], index: true },
    schoolCode: { type: String, index: true },
}, { timestamps: true })

module.exports = mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubSchema)