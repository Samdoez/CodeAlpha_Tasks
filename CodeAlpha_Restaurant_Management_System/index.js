import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
const port = 3000;
env.config();
const saltRounds = 10;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use( session({
    secret: process.env.SESSION_SECRET || "supersecretkey", 
    resave: false,                                         
    saveUninitialized: false,                              
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
  })
);

const db = new pg.Client({
  user: process.env.PG_user,
  host: process.env.PG_HOST,  
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect((err) => {
  if (err) {
    console.error("DB connection error:", err.stack);
  } else {
    console.log("Successfully connected to the PostgreSQL DB");
  }
});

//to handle the index page
app.get("/", (req, res) =>{
    try {
        return res.render("index.ejs");
    } catch (error) {
        console.log("An error occured: ", error.stack);
        return res.status(500).render("index.ejs", {error: "Internal Server Error"})
    }
})

app.listen(port, () => { 
  console.log(`Server running on port: ${port}`);
}); 
