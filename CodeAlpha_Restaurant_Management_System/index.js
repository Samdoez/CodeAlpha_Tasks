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

const db = new pg.Pool({
  user: process.env.PG_user,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect((err, client, release) => {
  if (err) {
    console.error("DB connection error:", err.stack);
  } else {
    console.log("Successfully connected to the PostgreSQL DB");
    release(); 
  }
});

//to render the createAccount page
app.get("/", (req, res) =>{
    try {
        return res.status(200).render("createAccount.ejs");
    } catch (error) {
        console.log("An error occured: ", error.stack);
        return res.status(500).render("createAccount.ejs", {error: "Internal Server Error"})
    }
});

//to handle all verification when creating an account 
app.post("/createAccount", async (req,res) => {
  const fname = (req.body.FName || "").toLowerCase().trim();
  const lname = (req.body.LName || "").toLowerCase().trim();
  const email = (req.body.email || "").toLowerCase().trim();
  const password = (req.body.password || "").trim();
  const confirmPassword = (req.body.confirmPassword || "").trim();

  if (!fname || !lname || !email || !password || !confirmPassword) {  //my check against empty field
    return res.status(400).render("createAccount.ejs", { error: "All fields are required" });
  }

  if (hasInvalidEmailDomain(email)) { //my check against invalid domain
    return res.status(400).render("createAccount.ejs", { error: "Invalid email domain. Please use a valid email address." });
  }

  if (fname.length <= 2 || lname.length <= 2) { //my check against name length
    return res.status(400).render("createAccount.ejs", { error: "First and last names must be at least 2 characters long." });
  }

  try {
    const checkEmail = await db.query("SELECT email FROM user_reg_table WHERE email = $1", [email]);

    if (checkEmail.rows.length > 0) {
      return res.status(400).render("createAccount.ejs", { error: "Email exists. Try Login" });
    }

    if (password !== confirmPassword) {
      return res.status(400).render("createAccount.ejs", { error: "Password Mis-match" });
    }
    //next implementing password hashing for security
      const hashedPassword = await bcrypt.hash(password, saltRounds);

    //if all verification successful inssert into DB and return RETURNING id for session handling
    const result = await db.query(
      "INSERT INTO user_reg_table (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING id", 
      [fname, lname, email, hashedPassword]
    );
    
    //to store new created user id in a session
    req.session.userId = result.rows[0].id;

    console.log("User registered and logged in with ID:", req.session.userId);
    return res.redirect("/userDashboard"); 
  } catch (error) {
    console.error("An error occurred:", error.stack);
    return res.status(500).render("createAccount.ejs", { error: "Internal Server Error" });
  }
});

//to render the login page
app.get("/loginPage", (req, res) =>{
    try {
        return res.status(200).render("loginUser.ejs");
    } catch (error) {
        console.log("An error occured: ", error.stack);
        return res.status(500).render("createAccount.ejs", {error: "Internal Server Error"})
    }
});

//to handle all verification when trying to login a user
app.post("/loginUser", async (req,res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const password = (req.body.password || "").trim();

  if (!email || !password) {  //my check against empty field
    return res.status(400).render("loginUser.ejs", { error: "All fields are required" });
  }

  if (hasInvalidEmailDomain(email)) { //my check against invalid domain
    return res.status(400).render("loginUser.ejs", { error: "Invalid email domain. Please use a valid email address." });
  }

  try { // to check the DB if the accounts xist
    const checkDetails = await db.query("SELECT id, email, password FROM user_reg_table WHERE email = $1", [email]);

    if (checkDetails.rows.length === 0) {
      return res.status(400).render("loginUser.ejs", { error: "Incorrect Details" });
    }

    const user = checkDetails.rows[0];
    
    //now i want to Compare entered plain-text password with stored hashed password
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(400).render("loginUser.ejs", { error: "Incorrect Details" });
    }

    //to save user id in session on successful login
    req.session.userId = user.id;

    console.log("User logged in with ID:", req.session.userId);
    return res.redirect("/userDashboard");

  } catch (error) {
    console.error("An error occurred:", error.stack);
    return res.status(500).render("loginUser.ejs", { error: "Internal Server Error" });
  }
});

//to render the userDashboard page
app.get("/userDashboard", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/");
  }
  try {
    const getMenuArray = await db.query("SELECT * FROM inventory_menu_table ORDER BY id");
    const menuRows = getMenuArray.rows;

    const updatedMenu = menuRows.map(item => {
        return {
          ...item,
          inventory_status: item.inventory_quantity === 0 ? "out of stock" : item.inventory_status
        };
      });

      return res.render("userDashboard.ejs", {
        menuArray: updatedMenu,
        message: null
      });

  } catch (error) {
      console.log("An error occured: ", error.stack);
       return res.status(500).render("userDashboard.ejs", {
        menuArray: [],
        message: "Error loading dashboard."
    })
  }
    
});

// order now route handler
app.post("/orderNow", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }

  const itemId = Number(req.body.itemId);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(itemId) || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: "Invalid order." });
  }

  const client = await db.connect();                       
  try {
    await client.query("BEGIN");                           

    const result = await client.query(                     
      `UPDATE inventory_menu_table
          SET inventory_quantity = inventory_quantity - $1,
              inventory_status = CASE
                  WHEN inventory_quantity - $1 = 0 THEN 'out of stock'
                  ELSE inventory_status
              END
          WHERE id = $2 AND inventory_quantity >= $1
          RETURNING id, inventory_quantity, inventory_status, inventory_price;`,
      [quantity, itemId]
    );

    if (result.rows.length === 0) {                       
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Order failed: not enough stock." });
    }

    const totalPrice = (Number(result.rows[0].inventory_price) * quantity).toFixed(2);  

    await client.query(                                   
      `INSERT INTO activity_registration_table
         (user_id, inventory_id, activity_type, quantity, total_price, status)
       VALUES ($1, $2, 'FOOD_ORDER', $3, $4, 'Completed')`,
      [req.session.userId, itemId, quantity, totalPrice]
    );

    await client.query("COMMIT");                  
    console.log("Order Successful")       
    return res.status(200).json({ success: true });
  } catch (error) {
      await client.query("ROLLBACK");                       
      console.error("Order error:", error.stack);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
  } finally {
    client.release();                                     
  }
});

// POST handler for a delete Order from the bookedOrder page
app.post("/deleteOrder", async(req, res) => {
  if (!req.session.userId) {
      return res.redirect("/");
  }
  const orderId = Number(req.body.orderId);

  if (!Number.isInteger(orderId)) {
    return res.status(400).render("bookedOrders.ejs", { bookedOrdersArray: [], message: "Invalid order." });
  }

  const client = await db.connect();
  try {
      await client.query("BEGIN");

      const deleted = await client.query(
        `DELETE FROM activity_registration_table
        WHERE id = $1 AND user_id = $2
        RETURNING activity_type, inventory_id, reservation_id, quantity`,
        [orderId, req.session.userId]
      );

      console.log("Deleted row:", deleted.rows);   // <-- add this one line here

      if (deleted.rows.length > 0) {
        const row = deleted.rows[0];

        if (row.activity_type === 'FOOD_ORDER') {
          await client.query(
            `UPDATE inventory_menu_table
            SET inventory_quantity = inventory_quantity + $1,
                inventory_status = 'instock'
            WHERE id = $2`,
            [row.quantity, row.inventory_id]
          );
        } else {
          await client.query(
            `UPDATE available_reservation_table
            SET reservation_quantity = reservation_quantity + $1,
                reservation_status = 'available'
            WHERE id = $2`,
            [row.quantity, row.reservation_id]
          );
        }
      }

      await client.query("COMMIT");
      console.log("Delete Successful")
      return res.redirect("/bookedOrders");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Delete order error:", error.stack);
        return res.status(500).render("bookedOrders.ejs", 
          { bookedOrdersArray: [], 
            message: "Could not delete the order."
          });
    } finally {
      client.release();
    }
});

//to render the bookReservation page
app.get("/bookReservation", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/");
  }
  try {
    const getReservationArray = await db.query("SELECT * FROM available_reservation_table ORDER BY id");
    const reservationRows = getReservationArray.rows;

    const updatedReservations = reservationRows.map(item => {
        return {
          ...item,
          reservation_status: item.reservation_quantity === 0 ? "out of stock" : item.reservation_status
        };
      });

      return res.render("bookReservation.ejs", {
        reservationsArray: updatedReservations,
        message: null
      });

  } catch (error) {
      console.log("An error occured: ", error.stack);
       return res.status(500).render("userDashboard.ejs", {
        reservationsArray: [],
        message: "Error loading dashboard."
    })
  }
});

//to  the order reservation table
app.post("/orderReservation", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please log in first." });
  }

  const reservationId = Number(req.body.itemId);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(reservationId) || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: "Invalid reservation." });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE available_reservation_table
          SET reservation_quantity = reservation_quantity - $1,
              reservation_status = CASE
                  WHEN reservation_quantity - $1 = 0 THEN 'out of stock'
                  ELSE reservation_status
              END
          WHERE id = $2 AND reservation_quantity >= $1
          RETURNING id, reservation_price;`,
      [quantity, reservationId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Reservation failed: not enough tables available." });
    }

    const totalPrice = (Number(result.rows[0].reservation_price) * quantity).toFixed(2);

    await client.query(
      `INSERT INTO activity_registration_table
         (user_id, reservation_id, activity_type, quantity, total_price, status)
       VALUES ($1, $2, 'TABLE_RESERVATION', $3, $4, 'Completed')`,
      [req.session.userId, reservationId, quantity, totalPrice]
    );

    await client.query("COMMIT");
    console.log("Order Successful") 
    return res.status(200).json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
      console.error("Reservation error:", error.stack);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
  } finally {
    client.release();
  }
});

// GET handler for the redirect to booked orders
app.get("/bookedOrders", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/");
  }

  try {
    const getCompletedOrders = await db.query(
     `SELECT a.id, a.activity_type,
              COALESCE(i.inventory_name, r.reservation_name) AS item_name,
              a.quantity, a.total_price, a.status,
              TO_CHAR(a.booked_date, 'DD Mon YYYY, HH12:MI AM') AS formatted_date
       FROM activity_registration_table a
       LEFT JOIN inventory_menu_table i ON i.id = a.inventory_id
       LEFT JOIN available_reservation_table r ON r.id = a.reservation_id
       WHERE a.user_id = $1
       ORDER BY a.booked_date DESC`,
      [req.session.userId]);
    
    const bookedOrdersArray = getCompletedOrders.rows;
    return res.status(200).render("bookedOrders.ejs", {bookedOrdersArray: bookedOrdersArray});
  } catch (error) {
    console.log("An error occured: ", error.stack);
    return res.status(500).render("bookedOrders.ejs", {
      bookedOrdersArray: [],
      message: "Could not load your orders. Please try again."
    });
  }
});

// to log out the current user
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).render("index.ejs", { error: "Could not log out" });
        }
        console.log("logout Successfully");
        res.clearCookie("connect.sid");
        res.redirect("/loginPage");
    });
});

function hasInvalidEmailDomain(email) {
  // Regex pattern
  const typoPattern = /@(gmai|gmal|gmial|yaho|outloo|hotmai)\.(com|net|org)$/i;
  return typoPattern.test(email);
}

app.listen(port, () => { 
  console.log(`Server running on port: ${port}`);
}); 