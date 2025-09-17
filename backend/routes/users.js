// routes/users.js
import express from 'express';
import db from '../db.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// This route proxies "registered users" from the registrations table for the admin dashboard
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT id, full_name, email, phone, role, cv_path, created_at FROM registrations ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, full_name, email, phone, role, cv_path, created_at FROM registrations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Download CV endpoint
router.get('/cv/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT full_name, cv_path FROM registrations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const { full_name, cv_path } = rows[0];
    if (!cv_path) return res.status(404).json({ error: 'CV not found' });

    // Check if it's a Cloudinary URL or local file
    if (cv_path.startsWith('http')) {
      // Cloudinary URL - redirect to the URL
      return res.redirect(cv_path);
    }

    // Local file path
    const filePath = path.resolve(cv_path);
    
    // Security check - ensure file is within uploads directory
    const uploadsDir = path.resolve('uploads');
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'CV file not found on server' });
    }

    // Get file extension and set appropriate MIME type
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'application/octet-stream';
    
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

    // Set headers for download with proper filename
    const safeFileName = full_name.replace(/[^a-zA-Z0-9.-]/g, '_') + ext;
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Type', mimeType);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

  } catch (err) {
    console.error('Error downloading CV:', err);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});

export default router;
