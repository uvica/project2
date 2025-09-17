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

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const useCloudinary = String(process.env.CLOUDINARY_ENABLED || '').toLowerCase() === 'true' &&
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Multer setup
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

// POST registration (upload CV)
router.post('/', upload.single('cv'), async (req, res) => {
  const { fullName, email, phone, roles, role } = req.body;
  // Accept both 'role' and 'roles' from frontend
  const rolesValue = roles || role || '';

  if (!fullName || !email || !req.file) {
    return res.status(400).json({
      error: 'Full name, email, and CV file are required',
      missing: {
        fullName: !fullName,
        email: !email,
        file: !req.file
      }
    });
  }

  const fileBuffer = fs.readFileSync(req.file.path);
  const originalName = req.file.originalname;

  try {
    const [existing] = await db.query('SELECT id FROM registrations WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already exists' });

    // Use correct columns
    const [dbResult] = await db.query(
      'INSERT INTO registrations (full_name,email,phone,roles,cv,cv_name) VALUES (?,?,?,?,?,?)',
      [fullName, email, phone, rolesValue, fileBuffer, originalName]
    );

    fs.unlinkSync(req.file.path);

    res.status(201).json({ message: 'Registration successful', id: dbResult.insertId });
  } catch (err) {
    console.error('Registration DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET all registrations (exclude CV binary)
router.get('/', async (_req, res) => {
  try {
    // Use correct columns
    const [regs] = await db.query(
      'SELECT id,full_name,email,phone,roles,cv_name,created_at FROM registrations ORDER BY id DESC'
    );
    res.json(regs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET CV download by registration ID
router.get('/:id/cv', async (req, res) => {
  const registrationId = req.params.id;

  try {
    // Use correct columns
    const [registration] = await db.query(
      'SELECT cv, cv_name, full_name FROM registrations WHERE id=?',
      [registrationId]
    );

    if (!registration.length) return res.status(404).json({ error: 'Registration not found' });

    const fileBuffer = registration[0].cv;
    const originalName = registration[0].cv_name || 'CV.pdf';
    const fullName = registration[0].full_name || 'CV';

    if (!fileBuffer) return res.status(404).json({ error: 'CV file not found' });

    const ext = path.extname(originalName).toLowerCase();
    let mimeType = 'application/pdf';
    if (ext === '.doc') mimeType = 'application/msword';
    if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fullName.replace(/[^a-zA-Z0-9.-]/g, '_')}_CV${ext}"`);
    res.send(fileBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
