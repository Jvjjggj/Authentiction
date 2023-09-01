const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
app.use(express.json());
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "twitterClone.db");
let db = null;
const connectDbToServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3020, () => {
      console.log(`Server is running 3012`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};
connectDbToServer();

const authentication = (request, response, next) => {
  const { tweet } = request.body;
  const { tweetId } = request.params;
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_KEY", async (error, payload) => {
      if (error) {
        response.send(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
        request.tweet = tweet;
        request.tweetId = tweetId;
        next();
      }
    });
  }
};

// API 1

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const query = `select * from user where username="${username}"`;
  const dbuser = await db.get(query);
  if (dbuser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createquery = `
            insert into user (name,username,password,gender)
            values ("${name}","${username}","${hashedPassword}","${gender}"; `;
      await db.run(createquery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

// API 2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const query = `
    select * from user where username="${username}"`;
  const dbuser = await db.get(query);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispassword = await bcrypt.compare(password, dbuser.password);
    if (ispassword) {
      const jwtToken = jwt.sign(dbuser, "MY_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invaid password");
    }
  }
});

// API 3   !!!Important

app.get("/user/tweets/feed/", authentication, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, password, gender, iat } = payload;
  //console.log(user_id);
  const tweetQuery = `select 
                       username,tweet,date_time as dateTime
                    from 
                       tweet inner join follower on (tweet.user_id=follower.following_user_id) inner join user on (user.user_id=follower.following_user_id)
                    where 
                       follower.follower_user_id=${user_id}`;
  const tweetArray = await db.all(tweetQuery);
  response.send(tweetArray);
});

// API 4

app.get("/user/following/", authentication, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, password, gender, iat } = payload;
  const query = `
              select 
                 name
              from 
                 user inner join follower on (user.user_id=follower.following_user_id)
              where 
                 follower.follower_user_id=${user_id}`;
  const dbresponse = await db.all(query);
  response.send(dbresponse);
});

module.exports = app;
