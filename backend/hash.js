const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

(async () => {
    try {
        // 1. Hash the password
        const plainPassword = 'admin123';
        const hash = await bcrypt.hash(plainPassword, 10);
        console.log('Generated hash:', hash);

        // 2. Connect to TiDB
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: {
                ca: require('fs').readFileSync(process.env.DB_CA)
            }
        });

        // 3. Update or insert admin
        const [existing] = await connection.execute(
            'SELECT id FROM admins WHERE email = ?',
            ['admin@talentconnect.com']
        );
        if (existing.length > 0) {
            await connection.execute(
                'UPDATE admins SET password = ? WHERE email = ?',
                [hash, 'admin@talentconnect.com']
            );
            console.log('✅ Password updated for admin@talentconnect.com');
        } else {
            await connection.execute(
                'INSERT INTO admins (email, password) VALUES (?, ?)',
                ['admin@talentconnect.com', hash]
            );
            console.log('✅ Admin created for admin@talentconnect.com');
        }

        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err);
    }
})();