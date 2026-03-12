// =====================================================
// models/school.js  — FIXED
// BUG: schoolCode was defined TWICE — first as required with no default,
//      second with the uuidv4() default. Mongoose threw "uuidv4 is not defined"
//      because of the conflicting duplicate key in the schema object.
// FIX: Merged into ONE clean field definition.
// =====================================================
const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const schoolSchema = new mongoose.Schema({
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true },
    phone:      { type: String, default: "" },
    address:    { type: String, default: "" },
    logo:       { type: String, default: "" },
    // ✅ FIXED: Single schoolCode field with auto-generation + index
    schoolCode: {
        type: String,
        unique: true,
        index: true,
        default: () => uuidv4().slice(0, 8).toUpperCase()
    },
    active: { type: Boolean, default: true }
}, { timestamps: true })

module.exports = mongoose.models.School || mongoose.model("School", schoolSchema)   