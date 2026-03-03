// classControllers.js
const Addclass = require('../models/class');

const class_post = async (req, res) => {
  try {
    const newClass = new Addclass(req.body);
    const savedClass = await newClass.save();
    res.status(201).json(savedClass);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const class_get = async (req, res) => {
  try {
    const classes = await Addclass.find().sort({ createdAt: -1 });
    res.status(200).json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const class_delete = async(req ,res) =>{
  try {
      const { id } = req.params
      await Addclass.findByIdAndDelete(id) // assuming you're using Mongoose
      res.json({ message: 'Deleted successfully' })
  } catch (err) {
      res.status(500).json({ error: err.message })
  }
}

const class_update = async (req, res) => {
  try {
      const { id } = req.params
      const updated = await Addclass.findByIdAndUpdate(id, req.body, { new: true })
      res.json(updated)
  } catch (err) {
      res.status(500).json({ error: err.message })
  }
}
 module.exports = { class_post, class_get ,class_delete ,class_update };