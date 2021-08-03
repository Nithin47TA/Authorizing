require('dotenv').config();
const encrypt=require('mongoose-encryption');
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const { WSATYPE_NOT_FOUND } = require("constants");
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const Schema = new mongoose.Schema({ email: String, Password: String });

Schema.plugin(encrypt,{secret:process.env.SECRETS,encryptedFields: ['Password']})
const User = mongoose.model("User", Schema);

app.get("/", (req, res) => {
  res.render("home");
});

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const newUser = new User({
      email: req.body.username,
      Password: req.body.password,
    });
    newUser.save((err) => {
      if (!err) {
        res.render("secrets");
        console.log(
          "\x1b[32m%s\x1b[0m",
          "No error succesfully inserted new user"
        );
      } else console.log("\x1b[31m%s\x1b[0m", "error");
    });
  });

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    User.findOne({ email: req.body.username }, (err, found) => {
      if (!err) {
          if(found){
            if (found.Password === req.body.password){
                console.log(
                    "\x1b[32m%s\x1b[0m",
                    "No error succesfully found new user"
                  );
                  res.render('secrets');
            }
            else{
                console.log(
                    "\x1b[31m%s\x1b[0m",
                    "No user found "
                  );
                  res.send("no such user");
            }
          }
          else{
              console.log("not present in DB");
          }
        
         
        
      } 
      else console.log("\x1b[31m%s\x1b[0m", "error");
    });
  });

app.listen("3000", () =>
  console.log("\x1b[33m%s\x1b[0m", "%listening in port 3000")
);
