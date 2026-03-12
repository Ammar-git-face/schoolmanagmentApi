const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    studentName: { type: String, required: true },
    studentClass: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, required: true },
    schoolCode: { type: String, required: true, index: true } ,
    teacherName: { type: String, required: true },
    date: { type: String, required: true }, // stored as "YYYY-MM-DD"
    status: { type: String, enum: ['present', 'absent', 'late'], required: true },
    term: { type: String, required: true },
    session: { type: String, required: true },
    remark: { type: String, default: '' }
}, { timestamps: true })

// prevent duplicate attendance for same student on same date
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true })

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)