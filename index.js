const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose");
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//middleware for parsing the header and body
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


//Connecting to my mongo db server.
try {
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("db connection success..");
} catch (error) {
  console.log(error);
}

//Schema for the user --
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }],
});

let User = mongoose.model('User', userSchema);

//To create and save the user in database -- 
const createAndSaveUser = async (userName) => {
  let userOne = new User({ username: userName, count: 0, log: [] });
  try {
    const savedUser = await userOne.save();
    return savedUser;
  } catch(error) {
    console.log("Error Saving User: " ,error);
  }
}


//Just to test if router is working..
app.get("/api/hello", (req, res) => {
  res.json({ "Message": "Hi the app is working as it should.." });
});

//Logic for the first router to create user in the database...
app.post("/api/users", async (req, res) => {
  const userName = req.body.username;
  const returnedData = await createAndSaveUser(userName);
  console.log(returnedData);
  res.json({ "Received": returnedData });
})


//Logic for saving the exercise according to user id generated in first step...
app.post("/api/users/:_id/exercises", (req, res) => {
  res.json({ "Message": "Saving user exercise details router working..." });
})





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
