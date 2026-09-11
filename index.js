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
import session from "express-session";

const app = express();
const port = 3000;
env.config();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

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

//to handle an account creation
app.post("/createAccount", async (req, res) => {
  const email = (req.body.email || "").trim();
  const password = (req.body.password || "").trim();
  const confirmPassword = (req.body.confirmPassword || "").trim();

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

    //if all verification successful inssert into DB and return RETURNING id for session handling
    const result = await db.query(
      "INSERT INTO user_reg (email, password) VALUES ($1, $2) RETURNING id", 
      [email, password]
    );
    
    //to store new created user id in a session
    req.session.userId = result.rows[0].id;

    console.log("User registered and logged in with ID:", req.session.userId);
    return res.redirect("/viewevents");
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
//to navigate to the loginPage setup
app.get("/adminloginPage", (req,res) =>{
    try {
        return res.render("admin.ejs");
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

     try { // Select the user ID along with email and password
    const checkDetails = await db.query(
      "SELECT id, email, password FROM user_reg WHERE email = $1 AND password = $2", 
      [email, password]
    );

    if (checkDetails.rows.length === 0) {
      return res.status(400).render("login.ejs", { error: "Incorrect Details" });
    }
    const user = checkDetails.rows[0];

    //to save user id in session on seccessful login
    req.session.userId = user.id;

    console.log("User logged in with ID:", req.session.userId);
    return res.redirect("/viewevents");
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
app.get("/viewevents", async (req, res) => {
  // Check if user is logged in
  if (!req.session.userId) {
    return res.redirect("/loginPage");
  }

  try { // use dynamic user from the session
    const currentUserId = req.session.userId;
    const getEvents = await getAllEvents(currentUserId);

    if (getEvents.length === 0) {
      return res.status(200).render("event.ejs", { message: "No Upcoming event currently" });
    }
    return res.status(200).render("event.ejs", { displayEvents: getEvents });
  } catch (error) {
    console.error("An error occurred:", error.stack);
    return res.status(500).render("index.ejs", { error: "Internal Server Error" });
  }
});

// Display single event details and events with their buttons
app.get("/viewDetails/:id", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/loginPage");
  }
  const id = req.params.id;
  if (!Number.isInteger(Number(id))) { //to check if it is a number
    return res.status(400).render("index.ejs", { error: "Invalid Event ID format" });
  }

  try { // next use ther user from session 
    const currentUserId = req.session.userId;
    const getEvents = await getAllEvents(currentUserId);
    
    const getEventDetails = await db.query(
      "SELECT event_id, event_name, event_location, event_capacity, TO_CHAR(event_date, 'HH12:MI AM, DDth Mon YYYY') AS formatted_date FROM event_details WHERE event_id = $1", 
      [id]
    );

    if (getEventDetails.rows.length === 0) {
      return res.status(404).render("error.ejs", { message: "Event not found." });
    }
    return res.status(200).render("event.ejs", {
      displayEvents: getEvents, 
      eventDetails: getEventDetails.rows[0]
    });
  } catch (error) {
    console.error("An error occurred:", error.stack);
    return res.status(500).render("index.ejs", { error: "Internal Server Error" });
  }
});

// registration submission
app.post("/registerEvent", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/loginPage");
  } 

  const { eventId, firstName, lastName, gender } = req.body; //i am applying object destructuring to get my inputs and call then directly
  const currentUserId = req.session.userId;

  try {
    await db.query("INSERT INTO registration (user_id, event_id, first_name, last_name, gender, event_reg_date) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)"
    , [currentUserId, eventId, firstName, lastName, gender]);
    return res.redirect("/viewevents");
  } catch (error) {
    console.error("Error registering event:", error.stack);
    return res.status(500).render("index.ejs", { error: "Failed to register for event." });
  }
});

// to unregister an event
app.get("/unregisterEvent/:id", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/loginPage");
  }
  const eventId = req.params.id;
  const currentUserId = req.session.userId;

  try {
    await db.query("DELETE FROM registration WHERE user_id = $1 AND event_id = $2",
    [currentUserId, eventId]);
    console.log("Delete successfully");
    return res.redirect("/viewevents");
  } catch (error) {
    console.error("Error unregistering event:", error.stack);
    return res.status(500).render("index.ejs", { error: "Failed to unregister from event." });
  }
});

// to log out the current user
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).render("index.ejs", { error: "Could not log out" });
        }
        res.clearCookie("connect.sid");
        res.redirect("/loginPage");
    });
});

async function getAllEvents(userId) {
    const result = await db.query(`
        SELECT e.event_id, e.event_name,
        CASE WHEN r.event_id IS NOT NULL THEN true ELSE false END AS is_registered
        FROM event_details e LEFT JOIN registration r ON r.event_id = e.event_id AND r.user_id = $1
    `, [userId]);
    return result.rows;
}

app.listen(port, () => { 
  console.log(`Server running on port: ${port}`);
}); 

