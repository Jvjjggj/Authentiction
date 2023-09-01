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
    app.listen(3011, () => {
      console.log(`Server is running 3011`);
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

// API 3

app.get("/user/tweets/feed/", authentication, async (request, response) => {
  const { payload } = request;
  response.send(payload);
});

module.exports = app;
