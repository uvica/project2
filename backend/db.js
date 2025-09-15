const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, process.env.DB_CA))
    }
});

// Test connection
pool.getConnection()
    .then(() => console.log('Connected to TiDB Cloud database!'))
    .catch(err => console.error('Database connection failed:', err.message));

module.exports = pool;
