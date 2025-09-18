import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/users - fetch all registered users
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv_url, created_at FROM registrations ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - fetch single user by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv_url, created_at FROM registrations WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
