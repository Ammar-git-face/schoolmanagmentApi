
const Salary = require('../models/teacherSalary')
const Teacher = require('../models/Teachers')

// Get salary history for a specific teacher


const salary_getAll = async (req, res) => {
    console.log('salary gotten')
    try {
        const history = await Salary.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 })
        res.json(history)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Get all salary records (admin view)

const salary_get  = async (req, res) => {
    console.log('salary gotten')
    try {
        const salaries = await Salary.find().sort({ createdAt: -1 })
        res.json(salaries)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

// Admin pays a teacher salary for a month


const salary_post =  async (req, res) => {
    console.log('salary gotten')
    try {
        const { teacherId, month, amount } = req.body
        const salary = await Salary.create({
            teacherId,
            month,
            amount,
            status: 'paid',
            paidDate: new Date()
        })
        // also update teacher's paid status
        await Teacher.findByIdAndUpdate(teacherId, { paid: 'paid' })
        res.json(salary)
    } catch (err) {
        res.status(500).json({ error: err.message })
    };
};
// Update salary status (admin marks as paid)

const salary_put =  async (req, res) => {
    console.log('salary gotten')
    try {
        const updated = await Salary.findByIdAndUpdate(
            req.params.id,
            { status: 'paid', paidDate: new Date() },
            { new: true }
        )
        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
};

module.exports = {salary_post , salary_put , salary_get , salary_getAll}


