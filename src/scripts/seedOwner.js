const mongoose = require("mongoose")
const bcrypt   = require("bcrypt")
const Owner    = require("../models/owner")
require("dotenv").config()

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const existing = await Owner.findOne({ email: "your@email.com" })
    if (existing) return console.log("Owner already exists") && process.exit()

    await Owner.create({
        fullname:      "Amar Hussaini Abdulmumin",
        email:         "amarhussaini72@email.com",
        password:      await bcrypt.hash("Owner/#/123", 10),
        schoolName:    "Ammar Management System",   // ← ADD
        schoolCode:    "OWNER001",                  // ← ADD (unique identifier for you)
        phone:         "08137477803",
        schoolAddress: "Royalscience@gmail.com"
    })
    console.log("Owner created successfully")
    process.exit()
})