const Pta = require('../models/pta')
const Student = require('../models/student');
const Teacher = require('../models/Teachers');

exports.pta_stats = async (req, res) => {
    try {
        const [students, teachers] = await Promise.all([
            Student.find().sort({ createdAt: -1 }),
            Teacher.find().sort({ createdAt: -1 })
        ])

        res.status(200).json({ students, teachers })

    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

exports.pta_post = async (req, res) => {
    try {
        const pta = new Pta(req.body)
        const savedPta = await pta.save()
        res.status(201).json(savedPta)
    } catch (err) {
        console.log(err)
    }
}

exports.pta_get = async (req, res) => {
    try {
        const pta = await Pta.find().sort({ createdAt: -1 });
        res.status(200).json(pta)

    } catch (err) {
        console.log(err)
    }
}