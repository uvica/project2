import express from 'express';
import db from '../db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

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
    const cv_filename = req.file.originalname;
    const cv_mimetype = req.file.mimetype;

    // Insert user into DB
    await db.query(
      'INSERT INTO users (full_name, email, phone, role, cv_url, cv_filename, cv_mimetype) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, role, cv_url, cv_filename, cv_mimetype]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user', details: err.message });
  }
});

// GET /api/registrations/:id/cv - Download CV file
router.get('/:id/cv', async (req, res) => {
  try {
    const userId = req.params.id;
    const [rows] = await db.query(
      'SELECT cv_url, full_name, cv_filename, cv_mimetype FROM users WHERE id = ?',
      [userId]
    );

    if (!rows.length || !rows[0].cv_url) {
      return res.status(404).json({ error: 'CV not found' });
    }

    const { cv_url, full_name, cv_filename, cv_mimetype } = rows[0];
    
    // Fetch the file from Cloudinary
    const response = await fetch(cv_url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch CV from storage' });
    }
    
    const buffer = await response.arrayBuffer();
    
    // Use stored metadata instead of guessing
    const contentType = cv_mimetype || 'application/octet-stream';
    const filename = cv_filename || `${full_name.replace(/[^a-zA-Z0-9.-]/g, '_')}_CV.pdf`;
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Error downloading CV:', err);
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
