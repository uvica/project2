// db.js
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// Fix for __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal debug
console.log('DB connection initializing...');

let sslConfig;
try {
  if (String(process.env.DB_REQUIRE_SSL || '').toLowerCase() === 'true') {
    const caPath = path.join(__dirname, process.env.DB_CA || 'certs/tidb-ca.pem');
    if (fs.existsSync(caPath)) {
      sslConfig = { rejectUnauthorized: true, ca: fs.readFileSync(caPath) };
    } else {
      console.warn('⚠️ DB CA file not found, proceeding without SSL:', caPath);
    }
  }
} catch (e) {
  console.warn('⚠️ Failed configuring DB SSL, proceeding without SSL:', e.message);
}

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 4000,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

// Test connection (do not exit on failure)
pool.getConnection()
  .then((conn) => { console.log("✅ DB pool ready"); conn.release(); })
  .catch(err => {
    console.error("❌ DB Connection Error (server will continue running):", err.message);
  });

export default pool;
