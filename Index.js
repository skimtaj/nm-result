

const express = require('express');
const app = express();
require('dotenv').config();
const db = require('./DB');
const path = require('path');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const cluster = require("cluster");
const os = require("os");

app.use(cookieParser())

app.use(session({
  secret: process.env.session,
  resave: false,
  saveUninitialized: true,
}));


app.use(flash());
app.use((req, res, next) => { res.locals.messages = req.flash(); next(); });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));


// app.set("views", path.join(__dirname, "adminModule", "Views"));
app.set('view engine', 'ejs');
app.use(bodyParser.json());


app.use('', require('./teacherModule/routes/teacher_routes'))

app.use('', require('./adminModule/routes/admin_routes'));



const numCPUs = os.cpus().length;

if (cluster.isPrimary) {

  console.log(`Master ${process.pid}`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {

    console.log(`Worker ${worker.process.pid} died`);

    // Restart the worker
    cluster.fork();

  });

} else {

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {

    console.log(`Worker ${process.pid} - Server is connected on port ${PORT}`);

  });

}










