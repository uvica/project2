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
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// =====================
// GET all partners
// =====================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM partners ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching partners:', err);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// =====================
// POST create new partner
// =====================
router.post('/', upload.single('image'), async (req, res) => {
    const { alt } = req.body;
    const src = req.file ? '/uploads/partners/' + req.file.filename : null;

    if (!src) return res.status(400).json({ error: 'Image is required' });

    try {
        const [result] = await db.query(
            'INSERT INTO partners (alt, src) VALUES (?, ?)',
            [alt, src]
        );
        res.status(201).json({ message: 'Partner added!', id: result.insertId });
    } catch (err) {
        console.error('Error adding partner:', err);
        res.status(500).json({ error: 'Failed to add partner' });
    }
});

// =====================
// PUT update partner
// =====================
router.put('/:id', upload.single('image'), async (req, res) => {
    const { alt } = req.body;
    const src = req.file ? '/uploads/partners/' + req.file.filename : null;

    try {
        const [existing] = await db.query('SELECT id FROM partners WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Partner not found' });

        let query = 'UPDATE partners SET alt=?';
        const params = [alt];

        if (src) {
            query += ', src=?';
            params.push(src);
        }

        query += ' WHERE id=?';
        params.push(req.params.id);

        await db.query(query, params);
        res.json({ message: 'Partner updated!' });
    } catch (err) {
        console.error('Error updating partner:', err);
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

// =====================
// DELETE partner
// =====================
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Partner not found' });
        res.json({ message: 'Partner deleted!' });
    } catch (err) {
        console.error('Error deleting partner:', err);
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

module.exports = router;
