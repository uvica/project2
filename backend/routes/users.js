import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET all users (for admin dashboard)
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, role, cv_url, created_at FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET a single user by ID (optional)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, role, cv_url, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
