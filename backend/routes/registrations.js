const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX files are allowed!'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/', upload.single('cv'), async (req, res) => {
    const { fullName, email, phone, role } = req.body;
    if (!fullName || !email || !req.file) {
        return res.status(400).json({ error: 'Full name, email, and CV are required' });
    }
    try {
        const [existing] = await db.query('SELECT id FROM registrations WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'registrations', resource_type: 'raw' },
                (error, uploadResult) => {
                    if (error) return reject(error);
                    resolve(uploadResult);
                }
            ).end(req.file.buffer);
        });
        const cv_path = result.secure_url;
        const [dbResult] = await db.query(
            'INSERT INTO registrations (full_name, email, phone, role, cv_path) VALUES (?, ?, ?, ?, ?)',
            [fullName, email, phone, role, cv_path]
        );
        res.status(201).json({ message: 'Registration successful', id: dbResult.insertId });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Failed to register user: ' + err.message });
    }
});
// Get all registrations
router.get('/', async (req, res) => {
  try {
    const [registrations] = await db.query(
      'SELECT id, full_name, email, phone, role, cv_path, created_at FROM registrations ORDER BY id DESC'
    );
    res.json(registrations);
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ error: 'Failed to fetch registrations: ' + err.message });
  }
});

module.exports = router;