import express from 'express';
import db from '../db.js';

const router = express.Router();

// Fetch all registered users (for admin dashboard)
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv, cv_name, created_at FROM registrations ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Fetch a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv, cv_name, created_at FROM registrations WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Download CV by user ID
router.get('/cv/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT full_name, cv, cv_name FROM registrations WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { full_name, cv, cv_name } = rows[0];

    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }

    // Detect MIME type based on extension
    let ext = '';
    let mimeType = 'application/octet-stream';

    if (cv_name) {
      ext = cv_name.substring(cv_name.lastIndexOf('.')).toLowerCase();
      switch (ext) {
        case '.pdf':
          mimeType = 'application/pdf';
          break;
        case '.doc':
          mimeType = 'application/msword';
          break;
        case '.docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case '.txt':
          mimeType = 'text/plain';
          break;
      }
    }

    // Create a safe filename
    const safeFileName = (full_name || 'cv').replace(/[^a-zA-Z0-9.-]/g, '_') + (ext || '');

    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Type', mimeType);

    // Send blob buffer directly
    res.end(cv);
  } catch (err) {
    console.error('Error downloading CV:', err);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});

export default router;
