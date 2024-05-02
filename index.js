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
  }
});
let User = mongoose.model('User', userSchema);

//The Schema for exercise logs--
const exerciseSchema = mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  description: String,
  duration: Number,
  date: Date
})
let Exercise = mongoose.model('Exercise', exerciseSchema);

//To create and save the user in database -- 
const createAndSaveUser = async (userName) => {
  let userOne = new User({ username: userName });
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

//to convert date to the string format asked in question..
const toDateString = (value) => {
  value = new Date(value);
  let dateArray = value.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).replaceAll(",", "").split(" ");
  if (parseInt(dateArray[2]) < 10) {
    dateArray[2] = "0" + dateArray[2];
  }
  return dateArray.join(" ");
}


//Logic for saving the exercise according to user id generated in first step...
app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  let exercise = "";
  let fetchedUser = ""
  let { description, duration, date } = req.body;
  try {
    fetchedUser = await User.findById(userId);
    if (!fetchedUser) {
      res.json({ "Error": "User_Id doesn't exist. Please enter correct Id." })
      return;
    }
    duration = parseInt(duration);
    date = date ? new Date(date) : new Date()
    const exerciseObj = new Exercise({
      user_id: userId,
      description: description,
      duration: duration,
      date: date
    });
    console.log(exerciseObj);
    exercise = await exerciseObj.save();
  } catch (error) {
    console.log(error);
    res.json({ "Error": "Someother issue occured, try again." });
    return;
  }
  res.json({
    "_id": userId, "username": fetchedUser.username, "date": toDateString(date),
    "duration": duration, "description": description
  });
});

//Below function will be used to fetch the logs from DB in accordance with the query parameters..
const fetchUsersWithParams = async (userId, fromDate, toDate, limit) => {
  let fetchedUser = "";
  let fetchedExercises = "";
  let responseToReturn = {};
  console.log(fromDate, toDate, limit);
  try {
    fetchedUser = await User.findById(userId);

    let dateObj = {};
    if (fromDate) {
      dateObj["$gte"] = new Date(fromDate);
    }
    if (toDate) {
      dateObj["$lte"] = new Date(toDate);
    }
    let filter = {
      user_id: userId
    }
    if (fromDate || toDate) {
      filter.date = dateObj;
    }
    console.log(filter);
    fetchedExercises = await Exercise.find(filter).limit(+limit || 1000); // + is used to parse the string to int.

    //Fabricating exercise logs according to question--
    responseToReturn.id = userId;
    responseToReturn.username = fetchedUser.username;
    responseToReturn.count = fetchedExercises.length;
    responseToReturn.logs = [];
    fetchedExercises.forEach(elem => {
      responseToReturn.logs.push({
        "description" : elem.description,
        "duration": elem.duration,
        "date": toDateString(elem.date)
      })
    })
    return responseToReturn;
  }
  catch (error) {
    console.log(error);
    return;
  }
}

//Below router will be used to get exercise logs of a user with the help of "_id"
app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const fromDate = req.query.from || null;
  const toDate = req.query.to || null;
  const limit = req.query.limit || null;
  let fetchedUser = await fetchUsersWithParams(userId, fromDate, toDate, limit);
  if (!fetchedUser) {
    res.json({ "error": "Either _id wrong or some other issue caused, try again." });
    return;
  }
  res.json({
    "_id": fetchedUser.id, "username": fetchedUser.username, "count": fetchedUser.count,
    "log": fetchedUser.logs
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
