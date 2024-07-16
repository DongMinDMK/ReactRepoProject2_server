const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require("dotenv");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
dotenv.config();
app.use(cookieParser(process.env.COOKIE_SECRET)); //쿠키사용
app.use(session({  resave:false,   saveUninitialized:false,  secret:"process.env.COOKIE_SECRET", cookie:{httpOnly:true, secure:false}}));

const passport = require("passport");
const passportConfig = require("./passport");
passportConfig();
app.use(passport.initialize());
app.use(passport.session());

app.set( 'port', process.env.PORT || 5000 );

app.use( '/', express.static(path.join(__dirname, 'public'))); 
app.use( '/images', express.static(path.join(__dirname, 'images'))); 
app.use( '/upimg', express.static(path.join(__dirname, 'uploads')));

const memberRouter = require('./routers/members');
app.use('/members', memberRouter);

const postRouter = require('./routers/posts');
app.use('/posts', postRouter);

app.listen(app.get('port'),()=>{console.log( app.get('port'),"port Server Open"); } )