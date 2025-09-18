import express from 'express';
import db from '../db.js';

const router = express.Router();

// ----------------- GET ALL USERS -----------------
router.get('/', async (_req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv_url, created_at FROM registrations ORDER BY id DESC'
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ----------------- GET SINGLE USER -----------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv_url, created_at FROM registrations WHERE id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
