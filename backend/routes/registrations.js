import express from 'express';
import db from '../db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const useCloudinary = String(process.env.CLOUDINARY_ENABLED || '').toLowerCase() === 'true';

let upload;
if (useCloudinary) {
  upload = multer({ storage: multer.memoryStorage() });
} else {
  const uploadsDir = path.resolve('uploads', 'registrations');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const disk = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.pdf';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });

  upload = multer({ storage: disk });
}

// Registration route
router.post('/', upload.single('cv'), async (req, res) => {
  const { fullName, email, phone, role } = req.body;

  if (!fullName || !email || !req.file) {
    return res.status(400).json({ error: 'Full name, email, and CV are required' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM registrations WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    const originalName = req.file.originalname;
    let cvPath = null;

    if (useCloudinary) {
      // Upload to Cloudinary as raw file
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'registrations', resource_type: 'raw' },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      cvPath = uploadResult.secure_url; // Store Cloudinary URL in cv field
    } else {
      // Local storage: store file path
      cvPath = path.join('uploads', 'registrations', req.file.filename).replace(/\\/g, '/');
    }

    await db.query(
      'INSERT INTO registrations (full_name, email, phone, roles, cv_name, cv) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, role, originalName, cvPath]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
