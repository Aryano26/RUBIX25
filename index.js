import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Client } = pkg;

const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

// Check if the password is a string
if (typeof process.env.DB_PASSWORD !== 'string') {
    console.error("Database password is not a string");
} else {
    console.log("Database password is a string");
}
console.log("Password type:", typeof process.env.DB_PASSWORD);

// Database Connection
const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
});

client.connect(err => {
    if (err) {
        console.error("Failed to connect to the database:", err);
    } else {
        console.log("Connected to the PostgreSQL database.");
    }
});

// Routes
app.get("/", (req,res) => {
    res.render("index.ejs", {})
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const query = "SELECT * FROM credential WHERE username = $1 AND password = $2";
    const values = [username, password];

    client.query(query, values, (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).render("login.ejs", { error: "Internal server error" });
        }

        if (result.rows.length > 0) {
            req.session.username = username;
            res.redirect("/dashboard");
        } else {
            res.render("login.ejs", { error: "Invalid username or password" });
        }
    });
});

app.get("/signup.ejs",(req,res) => {
    res.render("signup.ejs",{})
});

app.post("/signup.ejs",(req,res) => {
    const { username, password } = req.body;
    const query = "INSERT INTO credential (username, password) VALUES ($1, $2)";
    const values = [username, password];

    client.query(query, values, (err, result) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).render("signup.ejs", { error: "Registration failed" });
        }
        req.session.username = username;
        res.redirect("/dashboard");
    });
});

app.get("/dashboard", (req, res) => {
    const username = req.session.username;
    res.render("dashboard.ejs", { username });
});

app.post("/updateDomain", (req, res) => {
    const { domain } = req.body;
    const username = req.session.username;

    if (!username) {
        return res.status(401).send("Unauthorized");
    }

    const query = "UPDATE credential SET domain = $1 WHERE username = $2";
    const values = [domain, username];

    client.query(query, values, (err) => {
        if (err) {
            console.error("Error updating domain:", err);
            res.status(500).send("Failed to update domain.");
        } else {
            res.status(200).send("Domain updated successfully.");
        }
    });
});
app.get("/Create_team", (req, res) => {
    const username = req.session.username;
    res.render("Create_team.ejs", { username });
});

app.post("/Create_team", (req, res) => {
    const { teamName, domain } = req.body;
    const creator = req.session.username;

    if (!creator) {
        return res.status(401).send("Unauthorized");
    }

    // Generate team code
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 5);
    const teamCode = `${domain.substring(0, 3)}-${teamName.substring(0, 3)}-${timestamp.substring(timestamp.length - 3)}-${randomStr}`.toUpperCase();

    // Update the credential table with team details
    const updateQuery = "UPDATE credential SET teamcode = $1, teamname = $2, domain = $3 WHERE username = $4";
    const values = [teamCode, teamName, domain, creator];

    client.query(updateQuery, values, (err) => {
        if (err) {
            console.error("Error creating team:", err);
            return res.status(500).send("Failed to create team.");
        }

        res.status(200).json({ teamCode });
    });
});
app.post("/Join_team", (req, res) => {
    const username = req.session.username;
    res.render("Join_team.ejs", { username });
});

app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})