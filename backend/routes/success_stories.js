// routes/success_stories.js
import express from 'express';
import db from '../db.js';
import { createUploader, cloudinary } from '../config/cloudinary.js';

import path from 'path';

const router = express.Router();
const upload = createUploader('success_stories'); // memoryStorage for Cloudinary

// ---------------------- GET all success stories ----------------------
router.get('/', async (req, res) => {
  try {
    const [stories] = await db.query('SELECT * FROM success_stories ORDER BY id DESC');
    res.json(stories);
  } catch (err) {
    console.error('GET success stories error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- GET single story ----------------------
router.get('/:id', async (req, res) => {
  try {
    const [stories] = await db.query('SELECT * FROM success_stories WHERE id=?', [req.params.id]);
    if (!stories.length) return res.status(404).json({ error: 'Story not found' });
    res.json(stories[0]);
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

    // Upload to Cloudinary
    let imageUrl = req.file.path; // fallback local
    if (req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'success_stories', resource_type: 'image' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const [result] = await db.query(
      'INSERT INTO success_stories (quote,name,role,company,image,rating) VALUES (?,?,?,?,?,?)',
      [quote, name, role || null, company || null, imageUrl, rating || null]
    );

    res.status(201).json({
      message: 'Story created!',
      id: result.insertId,
      image: imageUrl
    });

  } catch (err) {
    console.error('POST success story error:', err);
    res.status(500).json({ error: 'Failed to create story', details: err.message });
  }
});

// ---------------------- PUT update story ----------------------
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { quote, name, role, company, rating } = req.body;

    if (!quote || !name) return res.status(400).json({ error: 'Quote and name are required' });

    const [existing] = await db.query('SELECT * FROM success_stories WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Story not found' });

    let imageUrl = null;
    if (req.file && req.file.buffer) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'success_stories', resource_type: 'image' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    let query = 'UPDATE success_stories SET quote=?, name=?, role=?, company=?, rating=?';
    const params = [quote, name, role || null, company || null, rating || null];

    if (imageUrl) {
      query += ', image=?';
      params.push(imageUrl);
    }

    query += ' WHERE id=?';
    params.push(req.params.id);

    await db.query(query, params);

    res.json({ message: 'Story updated!', image: imageUrl || existing[0].image });

  } catch (err) {
    console.error('PUT success story error:', err);
    res.status(500).json({ error: 'Failed to update story', details: err.message });
  }
});

// ---------------------- DELETE story ----------------------
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT image FROM success_stories WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Story not found' });

    // Delete image from Cloudinary if exists
    if (existing[0].image && existing[0].image.includes('cloudinary.com')) {
      const publicId = existing[0].image.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`success_stories/${publicId}`);
    }

    await db.query('DELETE FROM success_stories WHERE id=?', [req.params.id]);
    res.json({ message: 'Story deleted!' });

  } catch (err) {
    console.error('DELETE success story error:', err);
    res.status(500).json({ error: 'Failed to delete story', details: err.message });
  }
});

export default router;
