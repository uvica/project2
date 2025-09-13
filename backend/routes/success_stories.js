const fs = require('fs');
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/success_stories');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

/** =====================
 * GET all success stories
 ======================*/
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM success_stories ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching stories:', err);
        res.status(500).json({ error: 'Failed to fetch success stories' });
    }
});

/** =====================
 * GET single success story by ID
 ======================*/
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM success_stories WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Story not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching story:', err);
        res.status(500).json({ error: 'Failed to fetch story' });
    }
});

/** =====================
 * POST create new story
 ======================*/
router.post('/', upload.single('image'), async (req, res) => {
    const { quote, name, role, company, rating } = req.body;
    const imagePath = req.file ? '/uploads/success_stories/' + req.file.filename : null;

    try {
        const [result] = await db.query(
            'INSERT INTO success_stories (quote, name, role, company, image, rating) VALUES (?, ?, ?, ?, ?, ?)',
            [quote, name, role, company, imagePath, rating]
        );
        res.status(201).json({ message: 'Success story created!', id: result.insertId });
    } catch (err) {
        console.error('Error creating success story:', err);
        res.status(500).json({ error: 'Failed to create success story' });
    }
});

/** =====================
 * PUT update story
 ======================*/
router.put('/:id', upload.single('image'), async (req, res) => {
    const { quote, name, role, company, rating } = req.body;
    const imagePath = req.file ? '/uploads/success_stories/' + req.file.filename : null;

    try {
        const [existing] = await db.query('SELECT id FROM success_stories WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Story not found' });

        let query = 'UPDATE success_stories SET quote=?, name=?, role=?, company=?, rating=?';
        const params = [quote, name, role, company, rating];

        if (imagePath) {
            query += ', image=?';
            params.push(imagePath);
        }

        query += ' WHERE id=?';
        params.push(req.params.id);

        await db.query(query, params);
        res.json({ message: 'Success story updated!' });
    } catch (err) {
        console.error('Error updating story:', err);
        res.status(500).json({ error: 'Failed to update success story' });
    }
});

/** =====================
 * DELETE story
 ======================*/
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM success_stories WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Story not found' });
        res.json({ message: 'Success story deleted!' });
    } catch (err) {
        console.error('Error deleting story:', err);
        res.status(500).json({ error: 'Failed to delete success story' });
    }
});

module.exports = router;
