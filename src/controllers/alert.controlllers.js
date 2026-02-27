const Alert = require('../models/alert')


const alert_post = async (req, res) => {
    try {
        console.log(req.body)
        const newAlert = await new Alert(req.body)
        const announce = await newAlert.save()
        res.status(201).json(announce)

    } catch (err) {
        console.log(err)
        res.status(501).json({
            message: "not send,"
        })
    }
}

const alert_get = async (req, res) => {
    try {
        const alert = await Alert.find().sort({ createdAt: -1 })
        res.status(201).json(alert)
    } catch (err) {
        console.log(err)
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

module.exports = { alert_post, alert_get, alert_count }