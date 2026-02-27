const User = require =("./models/user")


exports.getuser = async (req , res)=>{

    try{
        const name = req.user.userName;
        const user = await user.findone({userName:name})
        const userName = user.userName
        const character = userName.charAt().toUpperCase()
res.status(200).json({
    userName,
    character
})
    }catch(err){
        console.log(err)
        res.status(400).son({
            message:err.message
        })
    }
}

// exports.getCharacter = async (req, res) => {
//     try {
//       const name = req.user.userName;
//       const user = await User.findOne({ userName:name})
  
//       const username = user.userName
//       const character = username.charAt().toUpperCase()
//       res.status(200).json({
//         username,
//         character
//       })
//     }
//     catch (err) {
//       res.status(400).json({
//         message: err.message
//       })
//     }
//   }
  