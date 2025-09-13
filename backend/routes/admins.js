const express = require('express');
const router = express.Router();
const db = require('../db');

// POST admin login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const [admins] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (admins.length === 0 || admins[0].password !== password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        res.json({ message: 'Login successful', admin: { id: admins[0].id, email: admins[0].email } });
    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).json({ error: 'Failed to login: ' + err.message });
    }
});

module.exports = router;