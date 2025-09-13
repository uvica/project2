const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');

const path = require('path');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, DOCX files are allowed!'));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Register user
router.post('/', upload.single('cv'), async (req, res) => {
    const { fullName, email, phone, role } = req.body;
    const cv_path = req.file ? req.file.filename : null;
    try {
        if (!fullName || !email) {
            return res.status(400).json({ error: 'Full name and email are required' });
        }
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, phone, role, cv_path) VALUES (?, ?, ?, ?, ?)',
            [fullName, email, phone, role, cv_path]
        );
        res.status(201).json({ message: 'Registration successful', id: result.insertId });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Failed to register user: ' + err.message });
    }
});

module.exports = router;