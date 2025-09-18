import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ----------------- CORS Setup -----------------
const allowedOriginsSet = new Set([
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000"
].filter(Boolean).map(u => u.replace(/\/$/, "")));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOriginsSet.has(origin.replace(/\/$/, ""))) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET","POST","PUT","DELETE"],
  credentials: true
}));

// ----------------- Middleware -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ----------------- Database Connection -----------------
let sslConfig;
try {
  if ((process.env.DB_REQUIRE_SSL || "").toLowerCase() === "true") {
    const caPath = process.env.DB_CA || "./certs/tidb-ca.pem";
    sslConfig = { rejectUnauthorized: true };
    if (fs.existsSync(caPath)) sslConfig.ca = fs.readFileSync(caPath);
  }
} catch (err) {
  console.warn("DB SSL config failed, proceeding without SSL", err);
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
  .then(conn => { console.log("✅ DB Connected"); conn.release(); })
  .catch(err => { console.error("❌ DB Connection Error:", err.message); });

// ----------------- Admin Users Route -----------------
app.get("/api/admin/users", async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        r.cv_url,
        r.cv_name,
        r.created_at AS registration_date
      FROM users u
      LEFT JOIN registrations r ON u.email = r.email
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching admin users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- Download CV Route -----------------
app.get("/api/download-cv/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [rows] = await db.execute(`
      SELECT r.cv_url, r.cv_name
      FROM users u
      LEFT JOIN registrations r ON u.email = r.email
      WHERE u.id = ?
    `, [userId]);

    if (!rows.length || !rows[0].cv_url) {
      return res.status(404).send("CV not found");
    }

    const { cv_url, cv_name } = rows[0];
    const response = await fetch(cv_url);
    if (!response.ok) return res.status(500).send("Failed to fetch CV");

    const buffer = await response.arrayBuffer();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${cv_name}"`
    });
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error("Error downloading CV:", err);
    res.status(500).send("Error downloading CV");
  }
});

// ----------------- Other Routes -----------------
import coursesRouter from "./routes/courses.js";
import faqsRouter from "./routes/faqs.js";
import partnersRouter from "./routes/partners.js";
import successStoriesRouter from "./routes/success_stories.js";
import siteStatsRouter from "./routes/site_stats.js";
import registrationsRouter from "./routes/registrations.js";
import adminsRouter from "./routes/admins.js";
import usersRouter from "./routes/users.js";
import consultationsRouter from "./routes/consultations.js";

app.use("/api/courses", coursesRouter);
app.use("/api/faqs", faqsRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/success_stories", successStoriesRouter);
app.use("/api/site_stats", siteStatsRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/admins", adminsRouter);
app.use("/api/users", usersRouter);
app.use("/api/consultations", consultationsRouter);

// ----------------- Test / Health -----------------
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ----------------- Optional Frontend Serving -----------------
const frontendPath = path.resolve("..", "frontend", "build");
if (fs.existsSync(frontendPath)) {
  console.log("✅ Frontend build found, serving static files.");
  app.use(express.static(frontendPath));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  console.warn("⚠️ Frontend build folder not found. Skipping static serving.");
}

// ----------------- Central Error Handler -----------------
app.use((err, _req, res, _next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({
    error: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// ----------------- Start Server -----------------
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
