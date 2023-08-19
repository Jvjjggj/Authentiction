const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3007, () => {
      console.log("Server Running at http://localhost:3006/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = bcrypt.hash(password, 10);
  const query = `
  select * from user 
  where username="${username}";`;
  const dbresponse = await db.get(query);
  if (dbresponse === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const createQuery = `
        insert into user(username,name,password,gender,location)
        values ("${username}","${name}","${hashedPassword}","${gender}","${location}"); `;
      const insertresponse = await db.run(createQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

module.exports = app;
