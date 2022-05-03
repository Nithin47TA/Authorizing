require("dotenv").config();
const encrypt = require("mongoose-encryption");
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const { WSATYPE_NOT_FOUND } = require("constants");
const app = express();
const md5 = require("md5");
const bcrypt = require("bcrypt");
const passport=require("passport");
const passport_local=require("passport-local");
const passport_local_mongoose=require('passport-local-mongoose');
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findorcreate = require("mongoose-findorcreate");
const FacebookStrategy = require('passport-facebook').Strategy;




app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret:'hello world',
  resave: false,
  saveUninitialized:true
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.MANGODB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

const Schema = new mongoose.Schema({ email: String, Password: String,googleId:String,facebookId:String,secret:String });
Schema.plugin(passport_local_mongoose);
Schema.plugin(findorcreate);
//Schema.plugin(encrypt,{secret:process.env.SECRETS,encryptedFields: ['Password']})
const User = mongoose.model("User", Schema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//oauth of google



passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
// oauth of facebook
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, done) {
  User.findOrCreate({ facebookId: profile.id }, function(err, user) {
    if (err) { return done(err); }
    done(null, user);
  });
}
));


app.get("/", (req, res) => {
  res.render("home");
});

// // without passport
// app
//   .route("/register")
//   .get((req, res) => {
//     res.render("register");
//   })
//   .post((req, res) => {
  
//     bcrypt.hash(req.body.password, 10, (err, hash) => {
//       if (!err) {
//         const newUser = new User({
//           email: req.body.username,
//           Password: hash,
//         });
//         newUser.save((err) => {
//           if (!err) {
//             res.render("secrets");
//             console.log(
//               "\x1b[32m%s\x1b[0m",
//               "No error succesfully inserted new user"
//             );
//           } else console.log("\x1b[31m%s\x1b[0m", "error");
//         });
//       }
//     });
    
  
//   });

// app
//   .route("/login")
//   .get((req, res) => {
//     res.render("login");
//   })
//   .post((req, res) => {
//     User.findOne({ email: req.body.username }, (err, found) => {
//       if (!err) {
//         if (found) {
//           // if (found.Password === md5(req.body.password)) {
//           //   console.log(
//           //     "\x1b[32m%s\x1b[0m",
//           //     "No error succesfully found new user"
//           //   );
//           //   res.render("secrets");
//           // } else {
//           //   console.log("\x1b[31m%s\x1b[0m", "No user found ");
//           //   res.send("no such user");
//           // }
//           bcrypt.compare(req.body.password, found.Password, function(err, result) {
//             if(result){
//               console.log(
//                     "\x1b[32m%s\x1b[0m",
//                     "No error succesfully found new user"
//                   );
//                   res.render("secrets");

//             }
//             else {
//             console.log("\x1b[31m%s\x1b[0m", "No user found ");
//             res.send("no such user");
//           }
//         });
//         } else {
//           console.log("not present in DB");
//         }
//       } else console.log("\x1b[31m%s\x1b[0m", "error");
//     });
//   });

// with passport

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secret');
  });

  app.get('/auth/facebook', passport.authenticate('facebook'));


  app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { successRedirect: '/secret',failureRedirect: '/login' }),(req,res)=>{ res.redirect("/secret")}); 

app.route("/secret").get((req,res)=>{
  if(req.isAuthenticated){ 
    User.find({secret:{$ne: null}},(err,userWithSecret)=>{
      if(err) console.log(err);
      else{
        console.log(userWithSecret[0]);
        if(userWithSecret) res.render("secrets",{secrets:userWithSecret});
        else res.render("secrets",{secrets:[]});
      }
    })
  }
  else{res.redirect("/");}
});
app.route('/login').get((req,res)=>{
res.render('login');
}).post((req,res)=>{
  const user=new User({username:req.body.username,password:req.body.password});
  req.login(user,(err)=>{
  if(err){
    console.log("login failed succesfully");
  }
  else{
    passport.authenticate('local',{successRedirect: '/secret', failureRedirect: '/login'})(req,res,()=>{res.redirect('/secret')});
  }
  })
});

app.route("/submit").get((req,res)=>{
  if(req.isAuthenticated){ res.render("submit");}
  else res.redirect("/login");


}).post((req,res)=>{
  const newSecret=req.body.secret;
  console.log(req.body.secret);
  console.log(req.user);
 
 User.findById(req.user.id,(err,response)=>{
  if(err) console.log("submit error not valid user id "+err);
  else{
     response.secret=newSecret;
     response.save((err)=>{
       if(err)console.log("save error");
       else{
         res.redirect("/secret");
       }
     });
  }
 });
});


app.route('/register').get((req,res)=>{
  res.render('register');
}).post((req,res)=>{
  User.register({username:req.body.username},req.body.password,(err,user)=>{
    if(!err){
      console.log("entered");
      passport.authenticate('local', { successRedirect: '/secret', failureRedirect: '/register' })(req,res,()=>{ res.redirect('/secret')});
    }
    else{
      console.log(err);
      console.log(req.body.username,req.body.password);
      res.redirect("/register");
    }
  })
});

app.route('/logout').get((req,res)=>{
  req.logout();
  res.redirect("/login");
})

let port=process.env.PORT||4000;
app.listen(port, () =>
  console.log("\x1b[33m%s\x1b[0m", "%listening in port 4000")
);
