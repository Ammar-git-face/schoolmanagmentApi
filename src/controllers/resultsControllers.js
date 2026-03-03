
const Result = require('../models/result')

// Get all results
exports.result_get = async (req, res) => {
    try {
        const results = await Result.find().sort({ createdAt: -1 })
        console.log('get')
        res.json(results)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Create result
exports.result_post = async (req, res) => {
    try {
        const result = await Result.create(req.body)
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Update result
exports.result_put = async (req, res) => {
    try {
        const updated = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Delete result
exports.result_delete = async (req, res) => {
    try {
        await Result.findByIdAndDelete(req.params.id)
        res.json({ message: 'Deleted successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

