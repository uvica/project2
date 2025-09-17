import express from 'express';
import db from '../db.js';
import { createUploader } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = createUploader('partners');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'partners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------------------- GET all partners ----------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, logo_url, created_at FROM partners ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET partners error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create partner ----------------------
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    console.log('Partner creation request:', {
      body: req.body,
      file: req.file
    });

    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Logo file is required' });
    }

    // Handle file path
    let logoUrl;
    if (req.file.path) {
      if (req.file.path.includes('cloudinary')) {
        logoUrl = req.file.path;
      } else {
        // For local storage, store relative path
        logoUrl = path.join('uploads', 'partners', path.basename(req.file.path));
        // Convert Windows backslashes to forward slashes for URLs
        logoUrl = logoUrl.replace(/\\/g, '/');
      }
    }

    if (!logoUrl) {
      throw new Error('Failed to process uploaded file');
    }

    const [result] = await db.query(
      'INSERT INTO partners (name, logo_url) VALUES (?, ?)',
      [req.body.name, logoUrl]
    );

    res.status(201).json({
      message: 'Partner added successfully',
      id: result.insertId,
      name: req.body.name,
      logo_url: logoUrl
    });

  } catch (err) {
    console.error('Partner creation error:', err);
    res.status(500).json({
      error: 'Failed to create partner',
      details: err.message
    });
  }
});

// ---------------------- PUT update partner ----------------------
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const params = [name];
    let query = 'UPDATE partners SET name = ?';

    if (req.file) {
      let logoUrl = req.file.secure_url || `/uploads/partners/${req.file.filename || path.basename(req.file.path)}`;
      query += ', logo_url = ?';
      params.push(logoUrl);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    const [result] = await db.query(query, params);
    if (!result.affectedRows) return res.status(404).json({ error: 'Partner not found' });

    res.json({ message: 'Partner updated!' });

  } catch (err) {
    console.error('Error updating partner:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- DELETE partner ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Partner not found' });

    res.json({ message: 'Partner deleted!' });

  } catch (err) {
    console.error('Error deleting partner:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
