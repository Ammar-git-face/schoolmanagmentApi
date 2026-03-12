const mongoose = require('mongoose')

const resultSchema = new mongoose.Schema({
    studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    studentName:     String,
    schoolCode:      { type: String, required: true, index: true },
    subject:         String,
    term:            { type: String, default: 'First Term' },
    session:         { type: String, default: '' },

    // ── Scores ──────────────────────────────────────────────────
    test:            { type: Number, max: 20, default: null },   // null = not yet entered
    note:            { type: Number, max: 20, default: null },
    assignment:      { type: Number, max: 10, default: null },
    exam:            { type: Number, max: 50, default: null },   // filled last
    total:           { type: Number, default: null },
    grade:           String,
    gpa:             Number,
    strengths:       String,
    areasToImprove:  String,
    comments:        String,

    // ── Status flow: draft → submitted → approved ────────────────
    // draft     = teacher saved scores but NOT ready for admin
    // submitted = teacher clicked "Submit to Admin" — admin can now review
    // approved  = admin approved — parent can now see
    status:          { type: String, enum: ['draft', 'submitted', 'approved'], default: 'draft', index: true },

    teacherId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    teacherName:     String,

    // Set by admin on approval
    approved:        { type: Boolean, default: false },
    teacherRemark:   { type: String, default: '' },
    principalRemark: { type: String, default: '' },
    approvedAt:      { type: Date, default: null },

    // Track when scores were last updated
    lastSavedAt:     { type: Date, default: null },
    submittedAt:     { type: Date, default: null },
}, { timestamps: true })

// Auto-calculate total + grade when all 4 scores are present
// ✅ async — no next() — same pattern as Admin model pre-save hook
resultSchema.pre('save', async function () {
    const { test, note, assignment, exam } = this
    if (test !== null && note !== null && assignment !== null && exam !== null) {
        this.total = (test || 0) + (note || 0) + (assignment || 0) + (exam || 0)
        const pct = this.total
        if (pct >= 75)      { this.grade = 'A'; this.gpa = 4.0 }
        else if (pct >= 65) { this.grade = 'B'; this.gpa = 3.0 }
        else if (pct >= 55) { this.grade = 'C'; this.gpa = 2.0 }
        else if (pct >= 45) { this.grade = 'D'; this.gpa = 1.0 }
        else                { this.grade = 'F'; this.gpa = 0.0 }
    }
})

module.exports = mongoose.models.Result || mongoose.model('Result', resultSchema)