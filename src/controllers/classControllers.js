const Addclass = require('../models/class')
const Teacher  = require('../models/Teachers')

const class_post = async (req, res) => {
    try {
        // Teacher field removed — assign teachers via teacher page instead
        const { grade, section, capacity } = req.body
        if (!grade) return res.status(400).json({ error: 'Grade is required' })

        const newClass = new Addclass({
            grade, section, capacity,
            schoolCode: req.schoolCode
        })
        const saved = await newClass.save()
        res.status(201).json(saved)
    } catch (err) {
        res.status(400).json({ error: err.message })
    }
}

const class_get = async (req, res) => {
    try {
        const classes = await Addclass.find({ schoolCode: req.schoolCode }).sort({ createdAt: -1 })
        res.status(200).json(classes)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const class_delete = async (req, res) => {
    try {
        await Addclass.findOneAndDelete({ _id: req.params.id, schoolCode: req.schoolCode })
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const class_update = async (req, res) => {
    try {
        const updated = await Addclass.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            req.body,
            { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Used by class page to show teachers dropdown
const get_teachers_for_class = async (req, res) => {
    try {
        const teachers = await Teacher.find({ schoolCode: req.schoolCode }, 'fullname assignedClasses').lean()
        res.json(teachers)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { class_post, class_get, class_delete, class_update, get_teachers_for_class }