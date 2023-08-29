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

// API 1 register
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const query = `
  select * 
  from user
  where 
     username="${username}";`;

  const dbbresponse = await db.get(query);

  if (dbbresponse === undefined) {
    //new User
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const query = `
          insert into 
             user (username,password,name,gender)
          values("${username}","${password}","${name}","${gender}");`;

      const dbresponse = await db.run(query);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// API 2 login
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const encryptPassword = await bcrypt.hash(password, 10);
  const query = `
  select *
  from 
     user
  where username="${username}";`;
  const dbresponse = await db.get(query);
  if (dbresponse === undefined) {
    //user not found
    response.status(400);
    response.send("Invalid user");
  } else {
    const ispassword = await bcrypt.compare(password, dbresponse.password);
    if (ispassword) {
      // correct password
      const payload = username;
      const jwtToken = await jwt.sign(payload, "MY_KEY");
      response.send({ jwtToken });
    } else {
      // false password
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const logger = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader === undefined) {
    response.status(400);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(400);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_KEY", async (error, user) => {
        if (error) {
          response.status(400);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }
};

app.get("/user/tweets/feed/", logger, async (request, response) => {
  const query = `
  select
     username,tweet,date_time as dateTime
  from 
     user inner join tweet on (user.user_id=tweet.user_id)
  order by
     date_time asc
  limit 4;`;
  const dbresponse = await db.all(query);
  response.send(dbresponse);
});

// API 3 all the peoples

app.get("/user/following/", logger, async (request, response) => {
  const query = `
    select name
    from  user join follower on (user.user_id=follower.following_user_id);`;
  const dbresponse = await db.all(query);
  response.send(dbresponse);
});

// API 4 followers

app.get("/user/followers/", logger, async (request, response) => {
  const query = `
    select 
       name
    from 
       user join follower on (user.user_id=follower.follower_id);`;
  const dbresponse = await db.all(query);
  response.send(dbresponse);
});

// API 6 tweet with tweet Id
app.get("/tweets/:tweetId/", logger, async (request, response) => {
  const { tweetId } = request.params;
  const query = `
  select * from 
      tweet 
  where 
     tweet_id=${tweetId};`;
  const dbresponse = await db.all(query);
  response.send(dbresponse);
});

// API 7

app.get("/tweets/:tweetId/likes/", logger, async (request, response) => {
  const { tweetId } = request.params;
  const query = `
    select 
      *
    from 
      like join user on (like.user_id=user.user_id)
    where 
       tweet_id=${tweetId};`;
  const dbresponse = await db.all(query);
  let lst = [];
  for (let i of dbresponse) {
    lst.push(i.name);
  }
  response.send({
    likes: lst,
  });
});

// API 8
app.get("/tweets/:tweetId/replies/", logger, async (request, response) => {
  const { tweetId } = request.params;
  const query = `
    select name,reply from 
    user join reply on (user.user_id=reply.user_id)
    where 
       tweet_id=${tweetId};`;
  const dbresponse = await db.all(query);
  response.send({
    replies: dbresponse,
  });
});

// API 9

app.get("/user/tweets/", logger, async (request, response) => {
  const { user } = request.query;
  const query1 = `
    select tweet,count(like_id) as likes,
    count(reply_id) as replies,date_time as dateTime
    from 
       like join tweet join user join reply on (reply.user_id=like.user_id=tweet.user_id=user.user_id)
    where 
       name="${user}";`;
  const dbresponse = await db.all(query1);

  response.send(dbresponse);
});
module.exports = app;
