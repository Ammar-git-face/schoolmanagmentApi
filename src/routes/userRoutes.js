const { Router } = require("express")
const getuser = require("../controllers/usercontroller")



const router = Router()

router.get('/getuser', usercontroller.getuser)

