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

// const class_getAll = async (req, res) => {
//   try {
//     const all = await Addclass.find()
//     const total = await Addclass.countDocuments()
//     res.status(201).json(total)
//   } catch (err) {
//     console.log(err)
//   }
// }
 module.exports = { class_post, class_get};