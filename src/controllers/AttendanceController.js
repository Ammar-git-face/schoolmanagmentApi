const Attendance = require('../models/Attendance')
const Student = require('../models/student')
const Teacher = require('../models/Teachers')

// Teacher marks attendance for entire class on a given date
exports.markAttendance = async (req, res) => {
    try {
        const teacherId = req.body.teacherId
        const className = req.body.className
        const date = req.body.date         // "YYYY-MM-DD"
        const term = req.body.term
        const session = req.body.session
        const records = req.body.records   // [{ studentId, status, remark }]
        const schoolCode = req.schoolCode

        if (!teacherId || !className || !date || !term || !session || !records) {
            return res.status(400).json({ error: 'All fields are required' })
        }

        const teacher = await Teacher.findById(teacherId).lean()
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        // get all students in this class
        const students = await Student.find({ studentClass: className }).lean()
        if (!students.length) return res.status(404).json({ error: 'No students found in this class' })

        const studentMap = {}
        students.forEach(s => { studentMap[s._id.toString()] = s })

        const ops = records.map(r => ({
            updateOne: {
                filter: { studentId: r.studentId, date },
                update: {
                    $set: {
                        studentId: r.studentId,
                        studentName: studentMap[r.studentId]?.fullname || 'Unknown',
                        studentClass: className,
                        teacherId,
                        schoolCode,
                        teacherName: teacher.fullname,
                        date,
                        status: r.status,
                        term,
                        session,
                        remark: r.remark || ''
                    }
                },
                upsert: true
            }
        }))

        await Attendance.bulkWrite(ops)
        res.json({ message: 'Attendance marked successfully' })
    } catch (err) {
        console.log('markAttendance error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Get all students in a class with today's attendance status (for teacher marking page)
exports.getClassAttendance = async (req, res) => {
    try {
        const className = req.params.className
        const date = req.params.date

        const students = await Student.find({ studentClass: className }, 'fullname studentClass').lean()
        const existingRecords = await Attendance.find({ studentClass: className, date }).lean()

        const recordMap = {}
        existingRecords.forEach(r => { recordMap[r.studentId.toString()] = r })

        const result = students.map(s => ({
            studentId: s._id,
            studentName: s.fullname,
            studentClass: s.studentClass,
            status: recordMap[s._id.toString()]?.status || 'present',
            remark: recordMap[s._id.toString()]?.remark || '',
            marked: !!recordMap[s._id.toString()]
        }))

        res.json({ students: result, alreadyMarked: existingRecords.length > 0 })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Get attendance records for a specific student (for parent view)
exports.getStudentAttendance = async (req, res) => {
    try {
        const studentId = req.params.studentId
        const term = req.query.term
        const session = req.query.session

        const query = { studentId }
        if (term) query.term = term
        if (session) query.session = session

        const records = await Attendance.find(query).sort({ date: -1 }).lean()

        const total = records.length
        const present = records.filter(r => r.status === 'present').length
        const absent = records.filter(r => r.status === 'absent').length
        const late = records.filter(r => r.status === 'late').length
        const attendanceRate = total > 0 ? Math.round((present + late) / total * 100) : 0

        res.json({ records, summary: { total, present, absent, late, attendanceRate } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin: get all attendance with filters
exports.getAllAttendance = async (req, res) => {
    try {
        const className = req.query.className
        const date = req.query.date
        const term = req.query.term
        const session = req.query.session

        const query = {}
        if (className) query.studentClass = className
        if (date) query.date = date
        if (term) query.term = term
        if (session) query.session = session

        const records = await Attendance.find(query).sort({ date: -1 }).limit(200).lean()

        // summary stats
        const total = records.length
        const present = records.filter(r => r.status === 'present').length
        const absent = records.filter(r => r.status === 'absent').length
        const late = records.filter(r => r.status === 'late').length

        res.json({ records, summary: { total, present, absent, late } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin: get attendance summary per class
exports.getClassSummary = async (req, res) => {
    try {
        const term = req.query.term
        const session = req.query.session

        const query = {}
        if (term) query.term = term
        if (session) query.session = session

        const records = await Attendance.find(query).lean()

        const classMap = {}
        records.forEach(r => {
            if (!classMap[r.studentClass]) {
                classMap[r.studentClass] = { present: 0, absent: 0, late: 0, total: 0 }
            }
            classMap[r.studentClass][r.status]++
            classMap[r.studentClass].total++
        })

        const summary = Object.entries(classMap).map(([className, data]) => ({
            className,
            ...data,
            attendanceRate: data.total > 0 ? Math.round((data.present + data.late) / data.total * 100) : 0
        }))

        res.json(summary)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}