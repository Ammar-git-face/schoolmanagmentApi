const Alert = require('../models/alert')


const alert_post = async (req, res) => {
    try {
        console.log(req.body)
        const newAlert = new Alert(req.body)
        const announce = await newAlert.save()
        res.status(201).json(announce)

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "not send,"
        })
    }
}

// const alert_get = (req, res) => {
//     try {
//         const alert = Alert.find().sort({ createdAt: -1 })
//         res.status(200).json(alert)
//     } catch (err) {
//         console.log(err)
//     }
// }


const alert_get = async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 })
        res.status(200).json(alerts)
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: "Failed to fetch alerts" })
    }
}
const alert_count = async (req, res) => {
    try {
        const get = await Alert.find()
        const getAll = await Alert.countDocuments()
        res.status(200).json(getAll)
    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "no alert available"
        })
    }
}
const alert_delete = async (req, res) => {
    try {
        const { id } = req.params
        await Alert.findByIdAndDelete(id) // assuming you're using Mongoose
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const alert_update = async (req, res) => {
    try {
        const { id } = req.params
        const updated = await Alert.findByIdAndUpdate(id, req.body, { new: true })
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

module.exports = { alert_post, alert_get, alert_count, alert_delete, alert_update }