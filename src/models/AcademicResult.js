const mongoose = require('mongoose')

const academicResultSchema = new mongoose.Schema({
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName:  { type: String, required: true },
    studentClass: { type: String, required: true },
    subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectName:  { type: String, required: true },
    schoolCode: { type: String, required: true, index: true } ,

    // CA
    caScore:      { type: Number, default: null },   // null = not yet submitted
    maxCA:        { type: Number, default: 40 },
    caSubmittedAt: { type: Date },
    caTeacherId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },

    // Exam
    examScore:    { type: Number, default: null },   // null = not yet submitted
    maxExam:      { type: Number, default: 60 },
    examSubmittedAt: { type: Date },
    examTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },

    // Calculated fields (auto-set when both scores exist)
    total:        { type: Number, default: null },   // caScore + examScore
    maxTotal:     { type: Number, default: 100 },    // maxCA + maxExam
    grade:        { type: String, default: null },   // A, B, C, D, F
    gradeRemark:  { type: String, default: null },   // Excellent, Very Good, etc.
    position:     { type: Number, default: null },   // position in class for this subject

    // Remarks (set after exam)
    teacherRemark:   { type: String, default: '' },
    principalRemark: { type: String, default: '' },

    // Status
    caApproved:   { type: Boolean, default: false },
    examApproved: { type: Boolean, default: false },

    term:    { type: String, required: true },    // 'First Term'
    session: { type: String, required: true },    // '2024/2025'
}, { timestamps: true })

// One result per student per subject per term per session
academicResultSchema.index(
    { studentId: 1, subjectName: 1, term: 1, session: 1 },
    { unique: true }
)

// Helper to calculate grade
function getGrade(score, maxScore) {
    const pct = (score / maxScore) * 100
    if (pct >= 75) return { grade: 'A', remark: 'Excellent' }
    if (pct >= 65) return { grade: 'B', remark: 'Very Good' }
    if (pct >= 55) return { grade: 'C', remark: 'Good' }
    if (pct >= 45) return { grade: 'D', remark: 'Pass' }
    return { grade: 'F', remark: 'Fail' }
}

// Auto-calculate total + grade when both scores are present
academicResultSchema.pre('save', function (next) {
    if (this.caScore !== null && this.examScore !== null) {
        this.total = this.caScore + this.examScore
        this.maxTotal = this.maxCA + this.maxExam
        const { grade, remark } = getGrade(this.total, this.maxTotal)
        this.grade = grade
        this.gradeRemark = remark
    }
    next()
})

module.exports = mongoose.models.AcademicResult || mongoose.model('AcademicResult', academicResultSchema)