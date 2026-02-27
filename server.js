const express = require("express");
const mongoose = require("mongoose");
const routes = require("./src/routes/authRoutes");
const teacherRoutes = require("./src/routes/teacherRoutes");
const studentRoute = require('./src/routes/studentRoutes');
const dashrouter = require('./src/routes/dashboardRoutes');
const classRoute = require('./src/routes/classRoutes')
const alertRoute = require('./src/routes/alertRoutes')
const cors = require('cors');
const cookiePparser = require('cookie-parser');
const { checkUser, requireAuth } = require('./src/middlewares/authmiddlewares')


const app = express();
app.use(express.urlencoded({ extended: true }));
// const port = 4000 
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "application/json"],
}))
app.use(express.json());
app.use(cookiePparser());

app.use('/student', studentRoute);
app.use('/teacher', teacherRoutes);
app.use('/class', classRoute);
app.use('/stats', dashrouter);
app.use('/alert', alertRoute)

const dburl = "mongodb://localhost:27017/schoolDb";
mongoose.connect(dburl)
  .then((result) => app.listen(5000))
  .then(console.log("server running"))
  .catch((err) => (console.log(err)))

app.use(routes)
app.use(checkUser);


app.get('/cookie', (req, res) => {
  res.cookie('newuser', true, { maxAge: 1000 * 60, httpOnly: true, secure: true })
  res.json('sucess')

})

