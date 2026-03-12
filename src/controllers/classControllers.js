const Addclass = require('../models/class')
const Teacher  = require('../models/Teachers')

const class_post = async (req, res) => {
    try {
        const { name, grade } = req.body

        // ✅ Both name and grade required — matches what the frontend sends
        if (!name || !grade)
            return res.status(400).json({ error: 'Class name and grade are required' })

        const newClass = await Addclass.create({
            name,
            grade,
            schoolCode: req.schoolCode   // ✅ always from middleware
        })
        res.status(201).json(newClass)
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

module.exports = { class_post, class_get, class_delete, class_update }