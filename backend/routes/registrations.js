import express from 'express';
import db from '../db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer setup for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// ----------------- REGISTER USER -----------------
router.post('/', upload.single('cv'), async (req, res) => {
  const { fullName, email, phone, role } = req.body;

  if (!fullName || !email || !req.file) {
    return res.status(400).json({ error: 'Full name, email, and CV are required' });
  }

  try {
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM registrations WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    // Upload CV to Cloudinary (raw file)
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'registrations', resource_type: 'raw' },
        (err, uploadResult) => (err ? reject(err) : resolve(uploadResult))
      );
      stream.end(req.file.buffer);
    });

    const cvUrl = result.secure_url;
    const originalName = req.file.originalname;

    // Save metadata in DB (no raw file stored)
    await db.query(
      'INSERT INTO registrations (full_name, email, phone, roles, cv_name, cv_url) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, role, originalName, cvUrl]
    );

    res.status(201).json({ message: 'Registration successful' });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// ----------------- GET ALL REGISTRATIONS -----------------
router.get('/', async (_req, res) => {
  try {
    const [regs] = await db.query(
      'SELECT id, full_name, email, phone, roles, cv_name, cv_url, created_at FROM registrations ORDER BY id DESC'
    );
    res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// ----------------- DOWNLOAD CV -----------------
router.get('/cv/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT full_name, cv_name, cv_url FROM registrations WHERE id=?',
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const { full_name, cv_name, cv_url } = rows[0];
    if (!cv_url) return res.status(404).json({ error: 'CV not found' });

    // Redirect to Cloudinary CV directly
    res.redirect(cv_url);

  } catch (err) {
    console.error('Download CV error:', err);
    res.status(500).json({ error: 'Failed to download CV' });
  }
});

export default router;
