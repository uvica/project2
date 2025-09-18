import express from 'express';
import db from '../db.js';

const router = express.Router();

// ---------------------- GET all users ----------------------
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv, created_at FROM registrations ORDER BY id DESC'
    );

    // Add cv_url for admin
    const users = rows.map(row => ({
      ...row,
      cv_url: row.cv_name || `/api/users/cv/${row.id}` // Cloudinary URL or local download route
    }));

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ---------------------- GET single user ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv, created_at FROM registrations WHERE id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    user.cv_url = user.cv_name || `/api/users/cv/${user.id}`;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ---------------------- Download CV ----------------------
router.get('/cv/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT full_name, cv_name, cv FROM registrations WHERE id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const { full_name, cv_name, cv } = rows[0];

    if (!cv && !cv_name) return res.status(404).json({ error: 'CV not found' });

    // Cloudinary CV → redirect
    if (cv_name && cv_name.startsWith('http')) {
      return res.redirect(cv_name);
    }

    // Local buffer → send as download
    const ext = cv_name ? cv_name.substring(cv_name.lastIndexOf('.')) : '.pdf';
    const mimeType = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain'
    }[ext.toLowerCase()] || 'application/octet-stream';

    const safeName = (full_name || 'cv').replace(/[^a-zA-Z0-9.-]/g, '_') + ext;

    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', mimeType);
    res.end(cv);
  } catch (err) {
    console.error('CV download error:', err);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});

export default router;
