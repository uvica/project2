const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all users
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, full_name, email, phone, role, cv_path FROM users');
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
    }
});

// GET single user by ID
router.get('/:id', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, full_name, email, phone, role, cv_path FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(users[0]);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Failed to fetch user: ' + err.message });
    }
});

module.exports = router;