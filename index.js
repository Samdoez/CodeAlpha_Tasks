import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import crypto from "crypto";
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

app.get("/", (req, res) =>{
    try{
      const { shortUrl, error } = req.query;
     res.render("index.ejs", { shortUrl, error });
    } catch (err){
      console.log("your request failed, No response from server", err.stack);
      res.status(500).render("index.ejs", {error: "Failed to get a response, check Url."});
}
});

//to convert a long url to a short code section
app.post("/submitLink", async (req, res) =>{
  try{
    const url = req.body.url.trim();
    let length = 6;

    // to check link duplicity and to see if it has been shortened b4
    const verifyLink = await db.query("SELECT short_code FROM urlshortener WHERE long_url = $1", [url]);
    if (verifyLink.rows.length > 0){

      const shortCode = verifyLink.rows[0].short_code;
      console.log(shortCode);

       return res.render("index.ejs", 
        {error: "This URL has been shortened. no duplicate link allowed, below is the shortened link",
         shortUrl: `http://localhost:3000/${shortCode}`
        });
    }

    //verification of the url after i have confirmed it has no duplicity
    if (url === "") {
       res.render("index.ejs", {error: "Please enter a valid URL."});
    }else if (!url.startsWith("http://") && !url.startsWith("https://")) {
       res.render("index.ejs", {error: "Please enter a valid URL starting with http:// or https://"});
    }else { 
      const shortCode = crypto.randomBytes(length).toString("base64url").slice(0, length);

      console.log("short Code:", shortCode);
      console.log("Received URL:", url);

      //after verification and code generation, nxt i will store the URL and short code in the DB
      const inserted  = await db.query("INSERT INTO urlshortener (long_url, short_code) VALUES ($1, $2) RETURNING *", [url, shortCode]);
      console.log(inserted.rows);

      res.render("index.ejs", {shortUrl: `http://localhost:3000/${shortCode}`});
    }
  }catch (err){
    console.log("An error just occured ", err.stack);
    res.render("index.ejs", {error: "error just occured."});
  }
});

// to setup the Set up a redirect route
app.get("/:passedcode", async(req, res) =>{ // retrieveing the passed code from client side
  try{
      const code = req.params.passedcode;

      const getMappedLink = await db.query("SELECT long_url FROM urlshortener WHERE short_code = $1", [code]);  

      if (getMappedLink.rows.length > 0) {
      const originalUrl = getMappedLink.rows[0].long_url; //to cappture or retrieve the long link
      console.log("Found URL:", originalUrl);
      
      return res.redirect(originalUrl);
    } else {
      return res.status(404).render("index.ejs", {error: "Short URL not found."});
    }
    } catch (err){
       console.error("redirecting error, check your code:", err.stack);
       res.render("index.ejs", {error: "error just occured."});
    }
})

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
}); 




