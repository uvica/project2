// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import multer from 'multer';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- CORS Setup -----------------
const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const o = origin.replace(/\/$/, '');
    if (allowedOrigins.has(o)) return callback(null, true);
    if (/^http:\/\/\d+\.\d+\.\d+\.\d+:(3000|5000)$/.test(o)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ----------------- Middleware -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Add error handling middleware before routes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  next(err);
});

// ----------------- Database Connection -----------------
let sslConfig;
try {
  const requireSsl = String(process.env.DB_REQUIRE_SSL || "").toLowerCase() === "true";
  const caPath = process.env.DB_CA || "./certs/tidb-ca.pem";
  if (requireSsl) {
    sslConfig = { rejectUnauthorized: true };
    if (fs.existsSync(caPath)) sslConfig.ca = fs.readFileSync(caPath);
  } else if (fs.existsSync(caPath)) {
    sslConfig = { rejectUnauthorized: true, ca: fs.readFileSync(caPath) };
  }
} catch (err) {
  console.warn("Failed to configure DB SSL. Proceeding without SSL.", err);
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  ...(sslConfig ? { ssl: sslConfig } : {})
});

db.getConnection()
  .then(conn => {
    console.log("✅ DB Connected!");
    conn.release();
  })
  .catch(err => {
    console.error("❌ DB Connection Error:", err.message);
  });

// ----------------- Routes -----------------
import coursesRouter from "./routes/courses.js";
import faqsRouter from "./routes/faqs.js";
import partnersRouter from "./routes/partners.js";
import successStoriesRouter from "./routes/success_stories.js";
import siteStatsRouter from "./routes/site_stats.js";
import registrationsRouter from "./routes/registrations.js";
import adminsRouter from "./routes/admins.js";
import usersRouter from "./routes/users.js";

app.use("/api/courses", coursesRouter);
app.use("/api/faqs", faqsRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/success_stories", successStoriesRouter);
// Alias to match frontend expectation
app.use("/api/stories", successStoriesRouter);
app.use("/api/site_stats", siteStatsRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/admins", adminsRouter);
app.use("/api/users", usersRouter);

// Optional test API
app.get("/api", (req, res) => {
  res.json({ message: "Backend is running!" });
});

// Health check for frontend probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ----------------- Serve Frontend -----------------
// Resolve to the project-level `frontend` folder when running from `backend/`
const frontendPath = path.resolve('..', 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ----------------- Start Server -----------------
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
