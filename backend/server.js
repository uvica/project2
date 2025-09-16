// server.js


import fs from "fs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- CORS Setup -----------------
app.use(cors({
  origin: process.env.FRONTEND_URL, // your frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ----------------- Middleware -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------- Database -----------------
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("DB Connection Error:", err);
  } else {
    console.log("DB Connected with SSL!");
    connection.release();
  }
});


// ----------------- Routes -----------------

// Root
app.get("/", (req, res) => res.send("Backend is running!"));

// site_stats
app.get("/site_stats", (req, res) => {
  const query = "SELECT * FROM site_stats LIMIT 1";
  db.query(query, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result[0] || {});
  });
});

// courses
app.get("/courses", (req, res) => {
  const query = "SELECT * FROM courses";
  db.query(query, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// users
app.get("/users", (req, res) => {
  const query = "SELECT * FROM users";
  db.query(query, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// partners
app.get("/partners", (req, res) => {
  const query = "SELECT * FROM partners";
  db.query(query, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// stories
app.get("/stories", (req, res) => {
  const query = "SELECT * FROM stories";
  db.query(query, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(result);
  });
});

// ----------------- Start Server -----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
