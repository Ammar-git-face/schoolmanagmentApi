// const PTA = require('../models/PTA')

// // Create meeting
// exports.create_meeting = async (req, res) => {
//     try {
//         const { title, agenda, type, date, time, duration, allTeachers, allParents } = req.body
//         // generate unique room name from title + timestamp
//         const roomName = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now()
//         const meeting = await PTA.create({
//             title, agenda, type, date, time, duration,
//             allTeachers, allParents, roomName
//         })
//         res.status(201).json(meeting)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Get all meetings
// exports.get_meetings = async (req, res) => {
//     try {
//         const meetings = await PTA.find().sort({ createdAt: -1 })
//         res.json(meetings)
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Mark as completed
// exports.complete_meeting = async (req, res) => {
//     try {
//         await PTA.findByIdAndUpdate(req.params.id, { status: 'completed' })
//         res.json({ message: 'Meeting marked as completed' })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Delete meeting
// exports.delete_meeting = async (req, res) => {
//     try {
//         await PTA.findByIdAndDelete(req.params.id)
//         res.json({ message: 'Deleted' })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

// // Stats — teachers and parents count
// exports.get_stats = async (req, res) => {
//     try {
//         const Teacher = require('../models/Teachers')
//         const Parent = require('../models/Parent')
//         const teachers = await Teacher.find({}, 'fullname')
//         const parents = await Parent.find({}, 'fullname')
//         res.json({ teachers, parents })
//     } catch (err) {
//         res.status(500).json({ error: err.message })
//     }
// }

const PTA     = require('../models/PTA')
const Teacher = require('../models/Teachers')
const Parent  = require('../models/Parent')

// POST /pta — create meeting
exports.create_meeting = async (req, res) => {
    try {
        const { title, agenda, type, date, time, duration, allTeachers, allParents } = req.body
        if (!title || !date || !time)
            return res.status(400).json({ error: 'Title, date and time are required' })

        const roomName = title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now()

        const meeting = await PTA.create({
            title, agenda, type, date, time, duration,
            allTeachers, allParents, roomName,
            schoolCode: req.schoolCode   // ✅ attach schoolCode from token
        })
        res.status(201).json(meeting)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /pta/get — only this school's meetings
exports.get_meetings = async (req, res) => {
    try {
        console.log("School Code:", req.schoolCode)
        const meetings = await PTA.find({ schoolCode: req.schoolCode }).sort({ createdAt: -1 })
        res.json(meetings)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// GET /pta/stats — teachers and parents count for this school
exports.get_stats = async (req, res) => {
    try {
        const teachers = await Teacher.find({ schoolCode: req.schoolCode }, 'fullname')
        const parents  = await Parent.find({ schoolCode: req.schoolCode }, 'fullname')
        res.json({ teachers, parents })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// PUT /pta/complete/:id
exports.complete_meeting = async (req, res) => {
    try {
        await PTA.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            { status: 'completed' }
        )
        res.json({ message: 'Meeting marked as completed' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// DELETE /pta/:id
exports.delete_meeting = async (req, res) => {
    try {
        await PTA.findOneAndDelete({ _id: req.params.id, schoolCode: req.schoolCode })
        res.json({ message: 'Deleted' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}