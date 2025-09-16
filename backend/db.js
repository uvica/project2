const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug environment variables
console.log('DB_CA:', process.env.DB_CA);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, process.env.DB_CA || 'certs/tidb-ca.pem'))
    }
});

// Test connection
pool.getConnection()
    .then(() => console.log('Connected to TiDB Cloud database!'))
    .catch(err => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    });

module.exports = pool;