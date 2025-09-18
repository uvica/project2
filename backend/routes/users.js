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
// Download CV by user ID
router.get('/cv/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT full_name, cv, cv_name FROM registrations WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const { full_name, cv, cv_name } = rows[0];
    if (!cv) return res.status(404).json({ error: 'CV not found' });

    // If Cloudinary URL, redirect
    if (cv.startsWith('http')) {
      return res.redirect(cv);
    }

    // Local file download
    const filePath = path.resolve(cv);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'CV file missing' });

    res.download(filePath, cv_name || `${full_name}_CV`);
  } catch (err) {
    console.error('Error downloading CV:', err);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});


export default router;
