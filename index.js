// TASK 2: Event Registration System 
// ● Set up backend using Django or Express.js to manage routes and logic. 
// ● Create models for events and user registrations in your database (like PostgreSQL, MongoDB etc.). 
// ● Build API endpoints to view event list, event details, and submit registration forms. 
// ● Link registrations to users and events, and allow users to manage (view/cancel) their registrations. 
// ● Optional: Add admin panel or authentication for event organizers. 

import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";


const app = express();
const port = 3000;
env.config();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

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

//to handle an account creation
app.post("/createAccount", async (req, res) => {
    const email = (req.body.email || "").trim();
    const password = (req.body.password || "").trim();
    const confirmPassword = (req.body.confirmPassword || "").trim();

    // to check all input field !empty
    if (!email || !password || !confirmPassword) {
        return res.status(400).render("index.ejs", { error: "All fields are required" });
    }

    try {
        const checkEmail = await db.query(
            "SELECT email FROM user_reg WHERE email = $1", 
            [email]
        );

        if (checkEmail.rows.length > 0) {
            return res.status(400).render("index.ejs", { error: "Email exists. Try Login" });
        }

        if (password !== confirmPassword) {
            return res.status(400).render("index.ejs", { error: "Password Mis-match" });
        }
        //if all verification successful inssert into DB
        const result = await db.query(
            "INSERT INTO user_reg (email, password) VALUES ($1, $2) RETURNING *", 
            [email, password]
        );
        console.log("Inserted successfully:", result.rows[0]);
        return res.redirect("/event");
    } catch (error) {
        console.error("An error occurred:", error.stack);
        return res.status(500).render("index.ejs", { error: "Internal Server Error" });
    }
});

//to navigate to the loginPage setup
app.get("/loginPage", (req,res) =>{
    try {
        return res.render("login.ejs");
    } catch (error) {
        console.log("An error occured: ", error.stack);
        return res.status(500).render("index.ejs", {error: "Internal Server Error"})
    }
});

//to handle an login section
app.post("/loginUser", async (req, res) => {
    const email = (req.body.email || "").trim();
    const password = (req.body.password || "").trim();

    if (!email || !password) {
        return res.status(400).render("index.ejs", { error: "Please enter email and password" });
    }

    try {
        const checkDetails = await db.query(
            "SELECT email, password FROM user_reg WHERE email = $1 AND password = $2", 
            [email, password]
        );

        if (checkDetails.rows.length === 0) {
            return res.status(400).render("login.ejs", { error: "Incorrect Details" });
        }

        console.log("Login Successfully:", checkDetails.rows[0]);
        return res.redirect("/event");
    } catch (error) {
        console.error("An error occurred:", error.stack);
        return res.status(500).render("index.ejs", { error: "Internal Server Error" });
    }
});

//to handle the event page
app.get("/event", (req, res) =>{
    try {
        return res.render("event.ejs");
    } catch (error) {
        console.error("An error occurred:", error.stack);
        return res.status(500).render("index.ejs", {error: "Internal Server Error"});
    }
})

//to display the events 
app.get("/viewevents", async(req,res) =>{
    try {
        const getEvents = await db.query("SELECT event_id, event_name FROM event_details");
        if (getEvents.rows.length === 0){
            return res.status(200).render("event.ejs", {message: "No Upcoming event currently"});
        }
        console.log(getEvents.rows)
        const displayEvents = getEvents.rows; //i can access an array with just the .rows method
        return res.status(200).render("event.ejs", {displayEvents: displayEvents});
    } catch (error) {
        console.error("An error occurred:", error.stack);
        return res.status(500).render("index.ejs", {error: "Internal Server Error"});
    }
})

//to display the event details
app.get("/viewDetails/:id", async(req,res) =>{
    const id = req.params.id;
    console.log(id);
    if (!Number.isInteger(Number(id))) {  // Check if ID is not a valid integer
        return res.status(400).render("index.ejs", { error: "Invalid Event ID format" });
    }

    try {
        const getEvents = await db.query("SELECT event_id, event_name FROM event_details");
        const getEventDetails = await db.query("SELECT event_id, event_name, event_location, event_capacity, TO_CHAR(event_date, 'HH12:MI AM, DDth Mon YYYY') AS formatted_date FROM event_details WHERE event_id = $1", [id]);
        if (getEventDetails.rows.length === 0){
            return res.status(404).render("error.ejs", { message: "Event not found." });
        }
        console.log(getEventDetails.rows);
        return res.status(200).render("event.ejs", {
            displayEvents: getEvents.rows, 
            eventDetails: getEventDetails.rows[0]});
       
    } catch (error) {
        console.error("An error occurred:", error.stack);
        return res.status(500).render("index.ejs", {error: "Internal Server Error"});
    }
})

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
}); 