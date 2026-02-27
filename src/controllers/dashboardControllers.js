const Student = require('../models/student');
const Teacher = require('../models/Teachers');
const Class = require('../models/class');
const dashboardStats = async (req, res) => {
    try {
        const [students, teachers, classes] = await Promise.all([
            Student.countDocuments(),
            Teacher.countDocuments(),
            Class.countDocuments()
        ]);

        res.status(200).json({
            students,
            teachers,
            classes
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { dashboardStats };