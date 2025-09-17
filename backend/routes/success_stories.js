// routes/success_stories.js
import express from 'express';
import db from '../db.js';
import { createUploader, cloudinary } from '../config/cloudinary.js';
import path from 'path';

const router = express.Router();
const upload = createUploader('success_stories');

// GET all success stories
router.get('/', async (req, res) => {
  try {
    const [stories] = await db.query('SELECT * FROM success_stories ORDER BY id DESC');
    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single story
router.get('/:id', async (req, res) => {
  try {
    const [stories] = await db.query('SELECT * FROM success_stories WHERE id=?', [req.params.id]);
    if (!stories.length) return res.status(404).json({ error: 'Story not found' });
    res.json(stories[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST create story
router.post('/', upload.single('image'), async (req, res) => {
  const { quote, name, role, company, rating } = req.body;
  if (!quote || !name || !role || !company || !rating || !req.file) return res.status(400).json({ error: 'All fields required' });

  // Normalize to web-served path
  let imageUrl = req.file.path;
  try {
    const rel = path.relative(process.cwd(), imageUrl).replace(/\\/g, '/');
    imageUrl = rel.startsWith('uploads/') ? `/${rel}` : `/${rel}`;
  } catch {}

  const [result] = await db.query('INSERT INTO success_stories (quote,name,role,company,image,rating) VALUES (?,?,?,?,?,?)', [quote,name,role,company,imageUrl,rating]);
  res.status(201).json({ message:'Story created!', id: result.insertId, image: imageUrl });
});

// PUT update story
router.put('/:id', upload.single('image'), async (req, res) => {
  const { quote, name, role, company, rating } = req.body;
  if (!quote || !name || !role || !company || !rating) return res.status(400).json({ error: 'All fields required' });

  const [existing] = await db.query('SELECT id,image FROM success_stories WHERE id=?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Story not found' });

  let query = 'UPDATE success_stories SET quote=?, name=?, role=?, company=?, rating=?';
  const params = [quote, name, role, company, rating];

  if (req.file) {
    let imageUrl = req.file.path;
    try {
      const rel = path.relative(process.cwd(), imageUrl).replace(/\\/g, '/');
      imageUrl = rel.startsWith('uploads/') ? `/${rel}` : `/${rel}`;
    } catch {}
    query += ', image=?';
    params.push(imageUrl);
  }

  query += ' WHERE id=?';
  params.push(req.params.id);

  await db.query(query, params);
  res.json({ message:'Story updated!' });
});

// DELETE story
router.delete('/:id', async (req, res) => {
  const [existing] = await db.query('SELECT image FROM success_stories WHERE id=?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Story not found' });

  if (existing[0].image) {
    const publicId = existing[0].image.split('/').slice(-1)[0].split('.')[0];
    await cloudinary.uploader.destroy(`success_stories/${publicId}`);
  }

  await db.query('DELETE FROM success_stories WHERE id=?', [req.params.id]);
  res.json({ message:'Story deleted!' });
});

export default router;
