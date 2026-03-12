const Alert = require('../models/alert')

// ✅ All queries now scoped to req.schoolCode — no cross-school data leakage

const alert_post = async (req, res) => {
    try {
        const newAlert = await Alert.create({
            ...req.body,
            schoolCode: req.schoolCode   // ✅ always from middleware, never trust client
        })
        res.status(201).json(newAlert)
    } catch (err) {
        console.error('alert_post error:', err.message)
        res.status(500).json({ message: 'Failed to create alert' })
    }
}

const alert_get = async (req, res) => {
    try {
        // ✅ Only return alerts for this school
        const alerts = await Alert.find({ schoolCode: req.schoolCode }).sort({ createdAt: -1 })
        res.status(200).json(alerts)
    } catch (err) {
        console.error('alert_get error:', err.message)
        res.status(500).json({ message: 'Failed to fetch alerts' })
    }
}

const alert_count = async (req, res) => {
    try {
        const count = await Alert.countDocuments({ schoolCode: req.schoolCode })
        res.status(200).json(count)
    } catch (err) {
        res.status(500).json({ message: 'Failed to count alerts' })
    }
}

const alert_delete = async (req, res) => {
    try {
        // ✅ Scoped delete — can't delete another school's alerts
        await Alert.findOneAndDelete({ _id: req.params.id, schoolCode: req.schoolCode })
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const alert_update = async (req, res) => {
    try {
        const updated = await Alert.findOneAndUpdate(
            { _id: req.params.id, schoolCode: req.schoolCode },
            req.body,
            { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { alert_post, alert_get, alert_count, alert_delete, alert_update }