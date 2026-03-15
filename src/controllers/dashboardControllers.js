const Student = require('../models/student')
const Teacher = require('../models/Teachers')
const Fee     = require('../models/fee')

const dashboardStats = async (req, res) => {
    try {
        const sc = req.schoolCode   // always set by attachSchool middleware

        // ✅ All queries filtered by schoolCode — each school sees only its own data
        const totalStudents = await Student.countDocuments({ schoolCode: sc })
        const totalTeachers = await Teacher.countDocuments({ schoolCode: sc })

        // unique classes from this school's students only
        const students = await Student.find({ schoolCode: sc }, 'studentClass').lean()
        const uniqueClasses = [...new Set(students.map(s => s.studentClass).filter(Boolean))]
        const totalClasses = uniqueClasses.length

        // students per class bar chart
        const classCounts = {}
        students.forEach(s => {
            if (s.studentClass) classCounts[s.studentClass] = (classCounts[s.studentClass] || 0) + 1
        })
        const barData = Object.entries(classCounts).map(([name, value]) => ({ name, value }))

        // fees — this school only
        const allFees    = await Fee.find({ schoolCode: sc }).lean()
        const paidFees   = allFees.filter(f => f.status === 'paid')
        const pendingFees = allFees.filter(f => f.status === 'pending')
        const feesCollected = paidFees.reduce((acc, f) => acc + (f.amount || 0), 0)
        const feesPending   = pendingFees.reduce((acc, f) => acc + (f.amount || 0), 0)

        const pieData = [
            { name: 'Paid',    value: paidFees.length },
            { name: 'Pending', value: pendingFees.length },
        ]

        const recentPayments = await Fee.find({ schoolCode: sc, status: 'paid' })
            .sort({ paidAt: -1 })
            .limit(5)
            .lean()

        res.status(200).json({
            totalStudents,
            totalTeachers,
            totalClasses,
            feesCollected,
            feesPending,
            pieData,
            barData,
            recentPayments
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { dashboardStats }