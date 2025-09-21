import express from 'express';
import db from '../db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { sendWelcomeEmail } from '../utils/emailService.js';

dotenv.config();

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() }); // Memory storage for Cloudinary

// Allowed file types for CV uploads
const ALLOWED_CV_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'application/rtf': '.rtf'
};

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];

// POST /api/registrations - Register a new user
router.post('/', upload.single('cv'), async (req, res) => {
  const { fullName, email, phone, role } = req.body;

  if (!fullName || !email || !req.file) {
    return res.status(400).json({ error: 'Full name, email, and CV are required' });
  }

  // Validate file type
  const fileExtension = req.file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0];
  const mimeType = req.file.mimetype;
  
  if (!ALLOWED_CV_TYPES[mimeType] && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return res.status(400).json({ 
      error: 'Invalid file format. Please upload a CV in one of these formats: PDF, DOC, DOCX, TXT, or RTF',
      allowedFormats: ['PDF', 'DOC', 'DOCX', 'TXT', 'RTF']
    });
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File size too large. Please upload a CV smaller than 10MB',
      maxSize: '10MB'
    });
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
    // Sanitize filename - remove problematic characters
    const cv_filename = req.file.originalname.replace(/[()[\]{}]/g, '').replace(/\s+/g, '_');
    const cv_mimetype = req.file.mimetype;

    // Insert user into DB
    const [dbResult] = await db.query(
      'INSERT INTO users (full_name, email, phone, role, cv_url, cv_filename, cv_mimetype) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, role, cv_url, cv_filename, cv_mimetype]
    );

    try {
      // Send welcome email
      await sendWelcomeEmail({
        email,
        full_name: fullName,
        phone: phone || 'Not provided',
        role: role || 'user'
      });
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      // Log error but don't fail the registration if email fails
      console.error('❌ Failed to send welcome email:', emailError);
    }

    res.status(201).json({ 
success: true,
      message: 'Registration successful',
      userId: dbResult.insertId 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register user', details: err.message });
  }
});

// GET /api/registrations/:id/cv/preview - Preview CV file (inline)
router.get('/:id/cv/preview', async (req, res) => {
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
    
    // Use stored metadata with fallbacks
    let contentType = cv_mimetype || 'application/octet-stream';
    
    // If no stored MIME type, try to determine from filename extension
    if (!cv_mimetype && cv_filename) {
      const ext = cv_filename.toLowerCase().match(/\.[^.]*$/)?.[0];
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.rtf': 'application/rtf'
      };
      contentType = mimeTypes[ext] || contentType;
    }
    
    // Ensure filename is safe for preview
    const safeFilename = cv_filename 
      ? cv_filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `${full_name.replace(/[^a-zA-Z0-9.-]/g, '_')}_CV.pdf`;
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeFilename}"`, // inline for preview
      'X-Frame-Options': 'SAMEORIGIN' // Allow iframe embedding
    });
    
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Error previewing CV:', err);
    res.status(500).json({ error: 'Failed to preview CV' });
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
    
    // Use stored metadata with fallbacks
    let contentType = cv_mimetype || 'application/octet-stream';
    
    // If no stored MIME type, try to determine from filename extension
    if (!cv_mimetype && cv_filename) {
      const ext = cv_filename.toLowerCase().match(/\.[^.]*$/)?.[0];
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.rtf': 'application/rtf'
      };
      contentType = mimeTypes[ext] || contentType;
    }
    
    // Ensure filename is safe for download
    const safeFilename = cv_filename 
      ? cv_filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `${full_name.replace(/[^a-zA-Z0-9.-]/g, '_')}_CV.pdf`;
    const filename = safeFilename;
    
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
