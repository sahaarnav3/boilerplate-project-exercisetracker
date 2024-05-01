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
    unique: true,
    required: true
  },
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }],
});
let User = mongoose.model('User', userSchema);

//To create and save the user in database -- 
const createAndSaveUser = async (userName) => {
  let userOne = new User({ username: userName, count: 0, log: [] });
  try {
    const savedUser = await userOne.save();
    return savedUser;
  } catch (error) {
    // console.log("Error Saving User: ", error);
    return null;
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
  if (!returnedData) {
    res.json({ "Failed": "Either Username already exists or Some false value is submitted.." });
    return;
  }
  res.json({ "username": userName, "_id": returnedData._id.valueOf() });
})

//Below router will be used to get a list of all users (Only username and _id)
app.get("/api/users", async (req, res) => {
  const allUsers = await User.find({}, { username: 1, _id: 1, __v: 1 });
  res.send(allUsers);
})

//Logic for saving the exercise according to user id generated in first step...
app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  let fetchedUser = "";
  try {
    fetchedUser = await User.findById(userId);

    //Date Manipulation
    let dateString = req.body.date;
    if (!dateString)
      dateString = new Date();
    else
      dateString = new Date(Date.parse(dateString));
    let dateArray = dateString.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).replaceAll(",", "").split(" ");
    if(parseInt(dateArray[2]) < 10){
      dateArray[2] = "0"+dateArray[2];
    }
    req.body.date = dateArray.join(" ");
    
    fetchedUser.log.push(req.body);
    fetchedUser.count = fetchedUser.count + 1;
    fetchedUser = await fetchedUser.save();
    // console.log(fetchedUser);
  } catch (error) {
    console.log(error);
    res.json({ "Error": "Some error Occured" });
    return;
  }
  res.json({
    "_id": userId, "username": fetchedUser.username, "date": req.body.date, "duration": req.body.duration,
    "description": req.body.description
  });
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
