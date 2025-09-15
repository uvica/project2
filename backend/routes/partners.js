const fs = require('fs');
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/partners');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Middleware to handle single file upload (logo)
const uploadMiddleware = upload.single('logo');

// =====================
// GET all partners
// =====================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, logo_path FROM partners ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching partners:', err);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// =====================
// POST create new partner
// =====================
router.post('/', uploadMiddleware, async (req, res) => {
    const { name } = req.body;
    const logoPath = req.file ? req.file.filename : null;

    if (!name || !logoPath) {
        if (req.file) fs.unlinkSync(path.join(__dirname, '../uploads/partners', logoPath)); // Clean up if validation fails
        return res.status(400).json({ error: 'Name and logo are required' });
    }

    try {
        const [result] = await db.query('INSERT INTO partners (name, logo_path) VALUES (?, ?)', [name, logoPath]);
        res.status(201).json({ message: 'Partner added!', id: result.insertId });
    } catch (err) {
        console.error('Error adding partner:', err);
        if (req.file) fs.unlinkSync(path.join(__dirname, '../uploads/partners', logoPath)); // Clean up on error
        res.status(500).json({ error: 'Failed to add partner' });
    }
});

// =====================
// PUT update partner
// =====================
router.put('/:id', uploadMiddleware, async (req, res) => {
    const { name } = req.body;
    const newLogoPath = req.file ? req.file.filename : null;

    try {
        const [existing] = await db.query('SELECT id, logo_path FROM partners WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            if (newLogoPath) fs.unlinkSync(path.join(__dirname, '../uploads/partners', newLogoPath));
            return res.status(404).json({ error: 'Partner not found' });
        }

        let query = 'UPDATE partners SET name = ?';
        const params = [name];

        if (newLogoPath) {
            query += ', logo_path = ?';
            params.push(newLogoPath);
            // Optionally delete the old logo if it exists and is different
            if (existing[0].logo_path && existing[0].logo_path !== newLogoPath) {
                fs.unlink(path.join(__dirname, '../uploads/partners', existing[0].logo_path), (err) => {
                    if (err) console.error('Error deleting old logo:', err);
                });
            }
        } else {
            // Keep the existing logo_path if no new file is uploaded
        }

        query += ' WHERE id = ?';
        params.push(req.params.id);

        await db.query(query, params);
        res.json({ message: 'Partner updated!' });
    } catch (err) {
        console.error('Error updating partner:', err);
        if (newLogoPath) fs.unlinkSync(path.join(__dirname, '../uploads/partners', newLogoPath)); // Clean up on error
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

// =====================
// DELETE partner
// =====================
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await db.query('SELECT logo_path FROM partners WHERE id = ?', [req.params.id]);
        const [result] = await db.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Partner not found' });

        // Delete the associated logo file if it exists
        if (existing[0].logo_path) {
            fs.unlink(path.join(__dirname, '../uploads/partners', existing[0].logo_path), (err) => {
                if (err) console.error('Error deleting logo file:', err);
            });
        }

        res.json({ message: 'Partner deleted!' });
    } catch (err) {
        console.error('Error deleting partner:', err);
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

module.exports = router;