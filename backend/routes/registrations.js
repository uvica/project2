// routes/registrations.js
import express from 'express';
import db from '../db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config();

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const useCloudinary = String(process.env.CLOUDINARY_ENABLED || '').toLowerCase() === 'true' &&
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

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
    }
  });
  upload = multer({ storage: disk });
}

router.post('/', upload.single('cv'), async (req, res) => {
  const { fullName, email, phone, role } = req.body;
  if (!fullName || !email || !req.file) return res.status(400).json({ error: 'Full name, email, CV required' });

  try {
    const [existing] = await db.query('SELECT id FROM registrations WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    let storedPath;
    if (useCloudinary) {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: 'registrations', resource_type: 'raw' }, (err, uploadResult) => {
          if (err) reject(err); else resolve(uploadResult);
        }).end(req.file.buffer);
      });
      storedPath = result.secure_url;
    } else {
      // Serve via /uploads
      const rel = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
      storedPath = rel.startsWith('uploads/') ? `/${rel}` : `/${rel}`;
    }

    const [dbResult] = await db.query('INSERT INTO registrations (full_name,email,phone,role,cv_path) VALUES (?,?,?,?,?)', [fullName,email,phone,role,storedPath]);
    res.status(201).json({ message:'Registration successful', id: dbResult.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET all registrations
router.get('/', async (req, res) => {
  try {
    const [regs] = await db.query('SELECT id,full_name,email,phone,role,cv_path,created_at FROM registrations ORDER BY id DESC');
    res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
