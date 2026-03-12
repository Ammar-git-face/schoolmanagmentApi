const Attendance = require('../models/Attendance')
const Student    = require('../models/student')
const Teacher    = require('../models/Teachers')

// Teacher marks attendance for entire class on a given date
exports.markAttendance = async (req, res) => {
    try {
        const { teacherId, className, date, term, session, records } = req.body
        const sc = req.schoolCode   // ✅ always from middleware

        if (!teacherId || !className || !date || !term || !session || !records)
            return res.status(400).json({ error: 'All fields are required' })

        const teacher = await Teacher.findOne({ _id: teacherId, schoolCode: sc }).lean()
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

        // ✅ Only students in this school
        const students = await Student.find({ studentClass: className, schoolCode: sc }).lean()
        if (!students.length) return res.status(404).json({ error: 'No students found in this class' })

        const studentMap = {}
        students.forEach(s => { studentMap[s._id.toString()] = s })

        const ops = records.map(r => ({
            updateOne: {
                filter: { studentId: r.studentId, date, schoolCode: sc },
                update: {
                    $set: {
                        studentId:    r.studentId,
                        studentName:  studentMap[r.studentId]?.fullname || 'Unknown',
                        studentClass: className,
                        teacherId,
                        teacherName:  teacher.fullname || teacher.name || 'Teacher',
                        date,
                        status:       r.status,
                        term,
                        session,
                        remark:       r.remark || '',
                        schoolCode:   sc       // ✅ saved on every record
                    }
                },
                upsert: true
            }
        }))

        await Attendance.bulkWrite(ops)
        res.json({ message: 'Attendance marked successfully' })
    } catch (err) {
        console.error('markAttendance error:', err.message)
        res.status(500).json({ error: err.message })
    }
}

// Get all students in a class with today's attendance (teacher marking page)
exports.getClassAttendance = async (req, res) => {
    try {
        const sc        = req.schoolCode
        const className = req.params.className
        const date      = req.params.date

        // ✅ Only this school's students
        const students = await Student.find(
            { studentClass: className, schoolCode: sc },
            'fullname studentClass'
        ).lean()

        // ✅ Only this school's attendance records
        const existingRecords = await Attendance.find(
            { studentClass: className, date, schoolCode: sc }
        ).lean()

        const recordMap = {}
        existingRecords.forEach(r => { recordMap[r.studentId.toString()] = r })

        const result = students.map(s => ({
            studentId:    s._id,
            studentName:  s.fullname,
            studentClass: s.studentClass,
            status:       recordMap[s._id.toString()]?.status || 'present',
            remark:       recordMap[s._id.toString()]?.remark || '',
            marked:       !!recordMap[s._id.toString()]
        }))

        res.json({ students: result, alreadyMarked: existingRecords.length > 0 })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Get attendance for a specific student (parent view)
exports.getStudentAttendance = async (req, res) => {
    try {
        const sc        = req.schoolCode
        const studentId = req.params.studentId
        const { term, session } = req.query

        // ✅ Scoped to school so parents can't query other schools' students
        const query = { studentId, schoolCode: sc }
        if (term)    query.term    = term
        if (session) query.session = session

        const records = await Attendance.find(query).sort({ date: -1 }).lean()

        const total   = records.length
        const present = records.filter(r => r.status === 'present').length
        const absent  = records.filter(r => r.status === 'absent').length
        const late    = records.filter(r => r.status === 'late').length
        const attendanceRate = total > 0 ? Math.round((present + late) / total * 100) : 0

        res.json({ records, summary: { total, present, absent, late, attendanceRate } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin: all attendance with filters
exports.getAllAttendance = async (req, res) => {
    try {
        const sc = req.schoolCode
        const { className, date, term, session } = req.query

        // ✅ Always scoped to school
        const query = { schoolCode: sc }
        if (className) query.studentClass = className
        if (date)      query.date         = date
        if (term)      query.term         = term
        if (session)   query.session      = session

        const records = await Attendance.find(query).sort({ date: -1 }).limit(200).lean()

        const total   = records.length
        const present = records.filter(r => r.status === 'present').length
        const absent  = records.filter(r => r.status === 'absent').length
        const late    = records.filter(r => r.status === 'late').length

        res.json({ records, summary: { total, present, absent, late } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin: attendance summary per class
exports.getClassSummary = async (req, res) => {
    try {
        const sc = req.schoolCode
        const { term, session } = req.query

        // ✅ Always scoped to school
        const query = { schoolCode: sc }
        if (term)    query.term    = term
        if (session) query.session = session

        const records = await Attendance.find(query).lean()

        const classMap = {}
        records.forEach(r => {
            if (!classMap[r.studentClass])
                classMap[r.studentClass] = { present: 0, absent: 0, late: 0, total: 0 }
            classMap[r.studentClass][r.status]++
            classMap[r.studentClass].total++
        })

        const summary = Object.entries(classMap).map(([className, data]) => ({
            className,
            ...data,
            attendanceRate: data.total > 0
                ? Math.round((data.present + data.late) / data.total * 100) : 0
        }))

        res.json(summary)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}