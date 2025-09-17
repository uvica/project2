// routes/partners.js
import express from 'express';
import db from '../db.js';
import { createUploader } from '../config/cloudinary.js';

const router = express.Router();
const upload = createUploader('partners'); // multer memoryStorage for Cloudinary

// ---------------------- GET all partners ----------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, logo_url, created_at FROM partners ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET partners error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create partner ----------------------
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    console.log('Request received:', { body: req.body, file: req.file });

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Logo file is required' });
    }

    let logoUrl = req.file.path;
    
    // For Cloudinary, use the secure_url if available
    if (req.file.secure_url) {
      logoUrl = req.file.secure_url;
    }
    // For local storage, format the URL properly
    else if (!logoUrl.startsWith('http')) {
      logoUrl = `/uploads/partners/${req.file.filename}`;
    }

    console.log('Logo URL to save:', logoUrl);

    const [result] = await db.query(
      'INSERT INTO partners (name, logo_url) VALUES (?, ?)',
      [name, logoUrl]
    );

    console.log('Database insert result:', result);

    return res.status(201).json({
      message: 'Partner added successfully',
      id: result.insertId,
      name,
      logo_url: logoUrl
    });

  } catch (err) {
    console.error('Partner creation error:', err);
    return res.status(500).json({
      error: 'Failed to create partner',
      details: err.message
    });
  }
});

// ---------------------- PUT update partner ----------------------
router.put('/:id', upload.single('logo'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  let logoUrl = null;

  if (req.file?.buffer) {
    try {
      const result = await new Promise((resolve, reject) => {
        const cloudinary = require('cloudinary').v2;
        cloudinary.uploader.upload_stream(
          { folder: 'partners', resource_type: 'image' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      logoUrl = result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: 'Failed to upload logo' });
    }
  }

  try {
    let query = 'UPDATE partners SET name = ?';
    const params = [name];
    if (logoUrl) {
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
 
