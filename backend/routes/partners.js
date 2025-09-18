// routes/partners.js
import express from 'express';
import db from '../db.js';
import { createUploader, cloudinary } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = createUploader('partners'); // memoryStorage for Cloudinary

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'partners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------------------- GET all partners ----------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM partners ORDER BY id DESC');

    const mappedRows = rows.map(p => ({
      ...p,
      logo_url: p.logo_url?.startsWith('http')
        ? p.logo_url // Cloudinary URL
        : `${process.env.API_BASE || req.protocol + '://' + req.get('host')}${p.logo_url}`
    }));

    res.json(mappedRows);
  } catch (err) {
    console.error('GET partners error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET single partner ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM partners WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Partner not found' });

    const partner = rows[0];
    partner.logo_url = partner.logo_url?.startsWith('http')
      ? partner.logo_url
      : `${process.env.API_BASE || req.protocol + '://' + req.get('host')}${partner.logo_url}`;

    res.json(partner);
  } catch (err) {
    console.error('GET single partner error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create partner ----------------------
router.post('/', upload.single('logo'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!req.file) return res.status(400).json({ error: 'Logo file is required' });

    // Determine logo URL (Cloudinary or local)
    let logoUrl = req.file.path; // fallback local path
    if (req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'partners', resource_type: 'image' },
          (err, result) => err ? reject(err) : resolve(result)
        ).end(req.file.buffer);
      });
      logoUrl = result.secure_url;
    } else {
      // local path
      logoUrl = `/uploads/partners/${req.file.originalname}`;
    }

    const [result] = await db.query(
      'INSERT INTO partners (name, logo_url) VALUES (?, ?)',
      [name, logoUrl]
    );

    res.status(201).json({
      message: 'Partner added successfully',
      id: result.insertId,
      name,
      logo_url: logoUrl
    });
  } catch (err) {
    console.error('POST partner error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PUT update partner ----------------------
router.put('/:id', upload.single('logo'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const [existing] = await db.query('SELECT * FROM partners WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Partner not found' });

    let logoUrl = existing[0].logo_url;

    if (req.file) {
      if (req.file.buffer) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'partners', resource_type: 'image' },
            (err, result) => err ? reject(err) : resolve(result)
          ).end(req.file.buffer);
        });
        logoUrl = result.secure_url;
      } else {
        logoUrl = `/uploads/partners/${req.file.originalname}`;
      }
    }

    await db.query('UPDATE partners SET name=?, logo_url=? WHERE id=?', [name, logoUrl, req.params.id]);
    res.json({ message: 'Partner updated!', logo_url: logoUrl });

  } catch (err) {
    console.error('PUT partner error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- DELETE partner ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM partners WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Partner not found' });

    // Delete Cloudinary image if exists
    if (existing[0].logo_url.startsWith('http') && existing[0].logo_url.includes('cloudinary.com')) {
      const publicId = existing[0].logo_url.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`partners/${publicId}`);
    }

    await db.query('DELETE FROM partners WHERE id=?', [req.params.id]);
    res.json({ message: 'Partner deleted!' });

  } catch (err) {
    console.error('DELETE partner error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
