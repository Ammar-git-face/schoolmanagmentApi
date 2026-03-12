const Result = require('../models/result')

// ─────────────────────────────────────────────────────────────────────────────
// POST /result/save-draft-bulk
// Teacher saves an entire class's scores for one subject at any point.
// Can be called repeatedly — exam field stays null until exam is done.
// Approved records are NEVER touched.
// ─────────────────────────────────────────────────────────────────────────────
exports.save_draft_bulk = async (req, res) => {
    try {
        const { records, subject, term, session, teacherId, teacherName } = req.body
        if (!records?.length || !subject || !term)
            return res.status(400).json({ error: 'records, subject and term are required' })

        const saved = []
        for (const r of records) {
            // Never touch approved records
            const existing = await Result.findOne({
                studentId:  r.studentId,
                subject, term, session,
                schoolCode: req.schoolCode,
                status:     { $in: ['draft', 'submitted'] }
            })

            if (existing) {
                // Only update fields that were actually provided (not null/undefined)
                if (r.test         != null) existing.test         = r.test
                if (r.note         != null) existing.note         = r.note
                if (r.assignment   != null) existing.assignment   = r.assignment
                if (r.exam         != null) existing.exam         = r.exam  // added when exam is done
                if (r.strengths)            existing.strengths    = r.strengths
                if (r.areasToImprove)       existing.areasToImprove = r.areasToImprove
                existing.status      = 'draft'
                existing.lastSavedAt = new Date()
                saved.push(await existing.save())
            } else {
                saved.push(await Result.create({
                    studentId:    r.studentId,
                    studentName:  r.studentName,
                    subject, term, session,
                    test:         r.test       ?? null,
                    note:         r.note       ?? null,
                    assignment:   r.assignment ?? null,
                    exam:         r.exam       ?? null,  // null until exam
                    strengths:    r.strengths    || '',
                    areasToImprove: r.areasToImprove || '',
                    teacherId, teacherName,
                    schoolCode:   req.schoolCode,
                    status:       'draft',
                    lastSavedAt:  new Date()
                }))
            }
        }
        res.json({ message: `${saved.length} drafts saved`, results: saved })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /result/submit/:subject/:term/:session
// Teacher submits all drafts for a subject to admin.
// Blocked if any student is missing an exam score.
// ─────────────────────────────────────────────────────────────────────────────
exports.submit_to_admin = async (req, res) => {
    try {
        const { subject, term, session } = req.params

        const incomplete = await Result.find({
            subject, term, session,
            schoolCode: req.schoolCode,
            status: 'draft',
            exam:   null
        }).lean()

        if (incomplete.length > 0) {
            return res.status(400).json({
                error: `Exam scores missing for ${incomplete.length} student(s): ${incomplete.map(r => r.studentName).join(', ')}`,
                incomplete: incomplete.map(r => ({ studentId: r.studentId, studentName: r.studentName }))
            })
        }

        const result = await Result.updateMany(
            { subject, term, session, schoolCode: req.schoolCode, status: 'draft' },
            { status: 'submitted', submittedAt: new Date() }
        )
        res.json({ message: `${result.modifiedCount} results submitted to admin` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /result/class/:className  ?subject=&term=&session=
// Load score sheet — every student in class appears, existing scores pre-filled
// ─────────────────────────────────────────────────────────────────────────────
exports.get_class_sheet = async (req, res) => {
    try {
        const { className }          = req.params
        const { subject, term, session } = req.query
        if (!subject || !term) return res.status(400).json({ error: 'subject and term are required' })

        const Student = require('../models/student')
        const students = await Student.find(
            { studentClass: className, schoolCode: req.schoolCode },
            '_id fullname'
        ).lean()

        const existing = await Result.find({
            subject, term, session,
            schoolCode: req.schoolCode,
            studentId: { $in: students.map(s => s._id) }
        }).lean()

        const map = {}
        existing.forEach(r => { map[r.studentId.toString()] = r })

        const sheet = students.map(s => {
            const r = map[s._id.toString()] || {}
            return {
                studentId:      s._id,
                studentName:    s.fullname,
                resultId:       r._id          || null,
                test:           r.test         ?? null,
                note:           r.note         ?? null,
                assignment:     r.assignment   ?? null,
                exam:           r.exam         ?? null,  // null = not entered yet
                total:          r.total        ?? null,
                grade:          r.grade        ?? null,
                strengths:      r.strengths    || '',
                areasToImprove: r.areasToImprove || '',
                status:         r.status       || 'not_started',
                lastSavedAt:    r.lastSavedAt  || null
            }
        })

        res.json({ sheet, subject, term, session, className })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /result/teacher/:teacherId
// Teacher dashboard — all their submissions grouped by subject+term+session
// ─────────────────────────────────────────────────────────────────────────────
exports.get_teacher_results = async (req, res) => {
    try {
        const results = await Result.find({
            teacherId:  req.params.teacherId,
            schoolCode: req.schoolCode
        }).sort({ updatedAt: -1 }).lean()

        const groups = {}
        results.forEach(r => {
            const key = `${r.subject}||${r.term}||${r.session}`
            if (!groups[key]) groups[key] = {
                subject: r.subject, term: r.term, session: r.session,
                teacherName: r.teacherName, records: []
            }
            groups[key].records.push(r)
        })

        const summary = Object.values(groups).map(g => ({
            subject:    g.subject,
            term:       g.term,
            session:    g.session,
            total:      g.records.length,
            draft:      g.records.filter(r => r.status === 'draft').length,
            submitted:  g.records.filter(r => r.status === 'submitted').length,
            approved:   g.records.filter(r => r.status === 'approved').length,
            // canSubmit = every student has all 4 scores + at least one is still draft
            canSubmit:  g.records.every(r => r.exam !== null) &&
                        g.records.some(r => r.status === 'draft'),
            lastSaved:  g.records.reduce((a, r) =>
                r.lastSavedAt > a ? r.lastSavedAt : a, null),
            records:    g.records
        }))

        res.json(summary)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /result/admin/pending  — admin sees all submitted results awaiting approval
// ─────────────────────────────────────────────────────────────────────────────
exports.get_pending_approval = async (req, res) => {
    try {
        const results = await Result.find({
            schoolCode: req.schoolCode,
            status:     'submitted'
        }).sort({ submittedAt: -1 }).lean()

        const groups = {}
        results.forEach(r => {
            const key = `${r.subject}||${r.term}||${r.session}`
            if (!groups[key]) groups[key] = {
                subject:     r.subject,
                term:        r.term,
                session:     r.session,
                teacherName: r.teacherName,
                submittedAt: r.submittedAt,
                records:     []
            }
            groups[key].records.push(r)
        })

        res.json(Object.values(groups))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /result/approve  — admin approves a batch of results
// ─────────────────────────────────────────────────────────────────────────────
exports.approve_results = async (req, res) => {
    try {
        const { subject, term, session, teacherRemark, principalRemark } = req.body

        const update = { status: 'approved', approved: true, approvedAt: new Date() }
        if (teacherRemark)   update.teacherRemark   = teacherRemark
        if (principalRemark) update.principalRemark = principalRemark

        const result = await Result.updateMany(
            { subject, term, session, schoolCode: req.schoolCode, status: 'submitted' },
            update
        )
        res.json({ message: `${result.modifiedCount} results approved` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─── Standard endpoints ──────────────────────────────────────────────────────

exports.result_get = async (req, res) => {
    try {
        const results = await Result.find({ schoolCode: req.schoolCode }).sort({ createdAt: -1 })
        res.json(results)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.get_approved_results = async (req, res) => {
    try {
        const results = await Result.find({ schoolCode: req.schoolCode, status: 'approved' })
        res.json(results)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.result_post = async (req, res) => {
    try {
        const result = await Result.create({ ...req.body, schoolCode: req.schoolCode, status: 'draft' })
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.result_put = async (req, res) => {
    try {
        const updated = await Result.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            req.body, { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.result_delete = async (req, res) => {
    try {
        await Result.findOneAndDelete({ _id: req.params.id, schoolCode: req.schoolCode })
        res.json({ message: 'Deleted' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}