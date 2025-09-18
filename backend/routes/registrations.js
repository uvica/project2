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
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() }); // Memory storage for Cloudinary

// POST /api/registrations - Register a new user
router.post('/', upload.single('cv'), async (req, res) => {
  const { fullName, email, phone, role } = req.body;

  if (!fullName || !email || !req.file) {
    return res.status(400).json({ error: 'Full name, email, and CV are required' });
  }

  try {
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    // Upload CV to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'users', resource_type: 'raw' },
        (err, uploadResult) => err ? reject(err) : resolve(uploadResult)
      );
      stream.end(req.file.buffer);
    });

    const cv_url = result.secure_url;

    // Insert user into DB
    await db.query(
      'INSERT INTO users (full_name, email, phone, role, cv_url) VALUES (?, ?, ?, ?, ?)',
      [fullName, email, phone, role, cv_url]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user', details: err.message });
  }
});

// GET /api/registrations/:id/cv - Redirect to the user's CV URL
router.get('/:id/cv', async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await db.query(
      'SELECT cv_url FROM users WHERE id = ?',
      [userId]
    );

    if (!rows.length || !rows[0].cv_url) {
      return res.status(404).json({ error: 'CV not found' });
    }

    // Redirect to the Cloudinary (or external) URL so the browser handles the file type correctly
    return res.redirect(302, rows[0].cv_url);
  } catch (err) {
    console.error('Error redirecting to CV URL:', err);
    res.status(500).json({ error: 'Failed to retrieve CV' });
  }
});

// GET /api/registrations - Get all users
router.get('/', async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, role, cv_url, created_at FROM users ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
