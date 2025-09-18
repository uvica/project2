// routes/success_stories.js
import express from 'express';
import db from '../db.js';
import { createUploader, cloudinary } from '../config/cloudinary.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const upload = createUploader('success_stories'); // memoryStorage for Cloudinary

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'success_stories');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------------------- GET all stories ----------------------
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM success_stories ORDER BY id DESC');

    const mappedRows = rows.map(s => ({
      ...s,
      image: s.image?.startsWith('http')
        ? s.image // Cloudinary
        : `${process.env.API_BASE || req.protocol + '://' + req.get('host')}${s.image}`
    }));

    res.json(mappedRows);
  } catch (err) {
    console.error('GET success stories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET single story ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM success_stories WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Story not found' });

    const story = rows[0];
    story.image = story.image?.startsWith('http')
      ? story.image
      : `${process.env.API_BASE || req.protocol + '://' + req.get('host')}${story.image}`;

    res.json(story);
  } catch (err) {
    console.error('GET single story error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- POST create story ----------------------
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { quote, name, role, company, rating } = req.body;
    if (!quote || !name) return res.status(400).json({ error: 'Quote and name are required' });
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });

    let imageUrl = req.file.path; // fallback local path
    if (req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'success_stories', resource_type: 'image' },
          (err, result) => err ? reject(err) : resolve(result)
        ).end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    } else {
      imageUrl = `/uploads/success_stories/${req.file.originalname}`;
    }

    const [result] = await db.query(
      'INSERT INTO success_stories (quote, name, role, company, image, rating) VALUES (?, ?, ?, ?, ?, ?)',
      [quote, name, role || null, company || null, imageUrl, rating || null]
    );

    res.status(201).json({ message: 'Story created!', id: result.insertId, image: imageUrl });

  } catch (err) {
    console.error('POST success story error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- PUT update story ----------------------
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { quote, name, role, company, rating } = req.body;
    if (!quote || !name) return res.status(400).json({ error: 'Quote and name are required' });

    const [existing] = await db.query('SELECT * FROM success_stories WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Story not found' });

    let imageUrl = existing[0].image;

    if (req.file) {
      if (req.file.buffer) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'success_stories', resource_type: 'image' },
            (err, result) => err ? reject(err) : resolve(result)
          ).end(req.file.buffer);
        });
        imageUrl = result.secure_url;
      } else {
        imageUrl = `/uploads/success_stories/${req.file.originalname}`;
      }
    }

    await db.query(
      'UPDATE success_stories SET quote=?, name=?, role=?, company=?, rating=?, image=? WHERE id=?',
      [quote, name, role || null, company || null, rating || null, imageUrl, req.params.id]
    );

    res.json({ message: 'Story updated!', image: imageUrl });

  } catch (err) {
    console.error('PUT success story error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- DELETE story ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM success_stories WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Story not found' });

    if (existing[0].image.startsWith('http') && existing[0].image.includes('cloudinary.com')) {
      const publicId = existing[0].image.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`success_stories/${publicId}`);
    }

    await db.query('DELETE FROM success_stories WHERE id=?', [req.params.id]);
    res.json({ message: 'Story deleted!' });

  } catch (err) {
    console.error('DELETE success story error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
