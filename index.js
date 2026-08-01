

const express = require('express');
const app = express();
require('dotenv').config();
const db = require('./DB');
const path = require('path');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const session = require('express-session');
const cookieParser = require('cookie-parser');

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
app.use(express.static(path.join(__dirname, 'Public')));
app.use(express.static(path.join(__dirname, 'uploads')));


// app.set("views", path.join(__dirname, "adminModule", "Views"));
app.set('view engine', 'ejs');

app.use(bodyParser.json());



/*app.use((req, res) => {

  if (req.originalUrl.startsWith('/nababiamission/reuslts/class-test-result')) {
    return res.status(404).render('404_page')
  }


  return res.status(404).send('404 - Page Not Found');

}) */


app.use('', require('./teacherModule/routes/teacher_routes'))

app.use('', require('./adminModule/routes/admin_routes'));


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log('Server is connected');

});




