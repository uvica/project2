const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('../db');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype) cb(null, true);
    else cb(new Error('Only image files (jpg, jpeg, png) are allowed!'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Create a new partner
router.post('/', upload.single('logo'), async (req, res) => {
  const { name, website } = req.body;
  if (!name || !req.file) {
    return res.status(400).json({ error: 'Name and logo are required' });
  }

  try {
    // Upload logo to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'partners', resource_type: 'image' },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      ).end(req.file.buffer);
    });

    const logoUrl = result.secure_url;

    // Insert into database
    const [dbResult] = await db.query(
      'INSERT INTO partners (name, logoUrl, website) VALUES (?, ?, ?)',
      [name, logoUrl, website || null]
    );

    res.status(201).json({ message: 'Partner added successfully', id: dbResult.insertId });

  } catch (err) {
    console.error('Error adding partner:', err);
    res.status(500).json({ error: 'Failed to add partner: ' + err.message });
  }
});
// Get all partners
router.get('/', async (req, res) => {
  try {
    const [partners] = await db.query('SELECT * FROM partners ORDER BY id DESC');
    res.json(partners);
  } catch (err) {
    console.error('Error fetching partners:', err);
    res.status(500).json({ error: 'Failed to fetch partners: ' + err.message });
  }
});


module.exports = router;
