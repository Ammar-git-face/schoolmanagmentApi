const Subject        = require('../models/Subject')
const AcademicResult = require('../models/AcademicResult')
const Student        = require('../models/student')

// ─── SUBJECT CRUD ────────────────────────────────────────────────────────────

exports.createSubject = async (req, res) => {
    try {
        const { name, className, maxCA, maxExam } = req.body
        if (!name || !className) return res.status(400).json({ error: 'Name and class are required' })

        const subject = await Subject.create({
            name:       name.trim(),
            className:  className.trim(),
            maxCA:      maxCA  || 40,
            maxExam:    maxExam || 60,
            schoolCode: req.schoolCode   // ✅
        })
        res.status(201).json(subject)
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'Subject already exists for this class' })
        res.status(500).json({ error: err.message })
    }
}

exports.getSubjects = async (req, res) => {
    try {
        const { className } = req.query
        const query = { isActive: true, schoolCode: req.schoolCode }   // ✅
        if (className) query.className = className
        const subjects = await Subject.find(query).sort({ className: 1, name: 1 }).lean()
        res.json(subjects)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.updateSubject = async (req, res) => {
    try {
        const subject = await Subject.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },   // ✅
            { $set: req.body },
            { new: true }
        )
        if (!subject) return res.status(404).json({ error: 'Subject not found' })
        res.json(subject)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.deleteSubject = async (req, res) => {
    try {
        await Subject.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },   // ✅
            { isActive: false }
        )
        res.json({ message: 'Subject removed' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.getClassesWithSubjects = async (req, res) => {
    try {
        const classes = await Subject.distinct('className', {
            isActive: true,
            schoolCode: req.schoolCode   // ✅
        })
        res.json(classes.sort())
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// ─── ACADEMIC RESULTS ────────────────────────────────────────────────────────

exports.submitCA = async (req, res) => {
    try {
        const { records, term, session, teacherId } = req.body
        if (!records?.length || !term || !session)
            return res.status(400).json({ error: 'records, term and session are required' })

        const results = []
        for (const r of records) {
            if (r.caScore === null || r.caScore === undefined) continue
            if (r.caScore < 0 || r.caScore > r.maxCA)
                return res.status(400).json({ error: `CA score for ${r.studentName} exceeds max of ${r.maxCA}` })

            const doc = await AcademicResult.findOneAndUpdate(
                { studentId: r.studentId, subjectName: r.subjectName, term, session, schoolCode: req.schoolCode },
                { $set: {
                    studentName:    r.studentName,
                    studentClass:   r.studentClass,
                    subjectId:      r.subjectId,
                    caScore:        r.caScore,
                    maxCA:          r.maxCA,
                    maxExam:        r.maxExam,
                    caSubmittedAt:  new Date(),
                    caTeacherId:    teacherId,
                    caApproved:     false,
                    schoolCode:     req.schoolCode    // ✅
                }},
                { upsert: true, new: true }
            )
            results.push(doc)
        }
        res.json({ message: `CA scores saved for ${results.length} students`, results })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.submitExam = async (req, res) => {
    try {
        const { records, term, session, teacherId } = req.body
        if (!records?.length || !term || !session)
            return res.status(400).json({ error: 'records, term and session are required' })

        const results = []
        for (const r of records) {
            if (r.examScore === null || r.examScore === undefined) continue
            if (r.examScore < 0 || r.examScore > r.maxExam)
                return res.status(400).json({ error: `Exam score for ${r.studentName} exceeds max of ${r.maxExam}` })

            const doc = await AcademicResult.findOneAndUpdate(
                { studentId: r.studentId, subjectName: r.subjectName, term, session, schoolCode: req.schoolCode },
                { $set: {
                    examScore:      r.examScore,
                    maxExam:        r.maxExam,
                    examSubmittedAt: new Date(),
                    examTeacherId:  teacherId,
                    examApproved:   false
                }},
                { new: true }
            )
            if (doc) results.push(doc)
        }
        res.json({ message: `Exam scores saved for ${results.length} students`, results })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.getClassResults = async (req, res) => {
    try {
        const { className, subjectName, term, session } = req.query
        if (!className || !subjectName || !term || !session)
            return res.status(400).json({ error: 'className, subjectName, term and session required' })

        // ✅ Only students from this school
        const students = await Student.find(
            { studentClass: className, schoolCode: req.schoolCode },
            '_id fullname studentClass'
        ).lean()

        const existing = await AcademicResult.find(
            { studentClass: className, subjectName, term, session, schoolCode: req.schoolCode }   // ✅
        ).lean()

        const existingMap = {}
        existing.forEach(r => { existingMap[r.studentId.toString()] = r })

        const sheet = students.map(s => {
            const result = existingMap[s._id.toString()] || {}
            return {
                studentId:    s._id,
                studentName:  s.fullname,
                studentClass: s.studentClass,
                caScore:      result.caScore   ?? null,
                examScore:    result.examScore ?? null,
                total:        result.total     ?? null,
                grade:        result.grade     ?? null,
                caApproved:   result.caApproved   || false,
                examApproved: result.examApproved || false,
                resultId:     result._id || null
            }
        })

        res.json({ sheet, subject: { name: subjectName } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.approveResults = async (req, res) => {
    try {
        const { className, subjectName, term, session, type } = req.body
        const update = {}
        if (type === 'ca'   || type === 'both') update.caApproved   = true
        if (type === 'exam' || type === 'both') update.examApproved = true

        const result = await AcademicResult.updateMany(
            { studentClass: className, subjectName, term, session, schoolCode: req.schoolCode },   // ✅
            { $set: update }
        )
        res.json({ message: `${result.modifiedCount} results approved` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.addRemarks = async (req, res) => {
    try {
        const { studentId, term, session, teacherRemark, principalRemark } = req.body
        const result = await AcademicResult.updateMany(
            { studentId, term, session, schoolCode: req.schoolCode },   // ✅
            { $set: { teacherRemark, principalRemark } }
        )
        res.json({ message: `Remarks updated for ${result.modifiedCount} subjects` })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.getReportCard = async (req, res) => {
    try {
        const { studentId }           = req.params
        const { term, session }       = req.query
        if (!term || !session) return res.status(400).json({ error: 'term and session required' })

        const results = await AcademicResult.find(
            { studentId, term, session, schoolCode: req.schoolCode }   // ✅
        ).lean()

        if (!results.length) return res.status(404).json({ error: 'No results found for this term' })

        const withTotal  = results.filter(r => r.total !== null)
        const totalScore = withTotal.reduce((s, r) => s + r.total, 0)
        const average    = withTotal.length > 0 ? parseFloat((totalScore / withTotal.length).toFixed(1)) : 0
        const { grade: avgGrade } = getGradeHelper(average, 100)

        const classResults    = await AcademicResult.find(
            { studentClass: results[0].studentClass, term, session, schoolCode: req.schoolCode }
        ).lean()

        const studentAverages = {}
        classResults.forEach(r => {
            if (!studentAverages[r.studentId]) studentAverages[r.studentId] = { scores: [] }
            if (r.total !== null) studentAverages[r.studentId].scores.push(r.total)
        })

        const rankings = Object.entries(studentAverages)
            .map(([id, v]) => ({
                studentId: id,
                average:   v.scores.length > 0 ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length : 0
            }))
            .sort((a, b) => b.average - a.average)

        const position      = rankings.findIndex(r => r.studentId === studentId.toString()) + 1
        const totalStudents = rankings.length

        res.json({
            studentId,
            studentName:    results[0].studentName,
            studentClass:   results[0].studentClass,
            term, session,
            subjects: results.map(r => ({
                subjectName: r.subjectName,
                caScore:     r.caScore,
                maxCA:       r.maxCA,
                examScore:   r.examScore,
                maxExam:     r.maxExam,
                total:       r.total,
                maxTotal:    r.maxTotal,
                grade:       r.grade,
                gradeRemark: r.gradeRemark
            })),
            totalScore, average, averageGrade: avgGrade,
            position, totalStudents,
            positionSuffix:   getPositionSuffix(position),
            teacherRemark:    results[0].teacherRemark    || '',
            principalRemark:  results[0].principalRemark  || ''
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

function getGradeHelper(score, max) {
    const pct = (score / max) * 100
    if (pct >= 75) return { grade: 'A', remark: 'Excellent' }
    if (pct >= 65) return { grade: 'B', remark: 'Very Good' }
    if (pct >= 55) return { grade: 'C', remark: 'Good' }
    if (pct >= 45) return { grade: 'D', remark: 'Pass' }
    return { grade: 'F', remark: 'Fail' }
}

function getPositionSuffix(n) {
    if (n === 1) return '1st'
    if (n === 2) return '2nd'
    if (n === 3) return '3rd'
    return `${n}th`
}