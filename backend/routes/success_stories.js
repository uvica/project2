const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET all success stories
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM success_stories ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching stories:', err);
        res.status(500).json({ error: 'Failed to fetch success stories' });
    }
});

// GET single success story by ID
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

// POST create new story
router.post('/', upload.single('image'), async (req, res) => {
    const { quote, name, role, company, rating } = req.body;
    if (!quote || !name || !role || !company || !rating || !req.file) {
        return res.status(400).json({ error: 'All fields and image are required' });
    }
    try {
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'success_stories' },
                (error, uploadResult) => {
                    if (error) return reject(error);
                    resolve(uploadResult);
                }
            ).end(req.file.buffer);
        });
        const imagePath = result.secure_url;
        const [dbResult] = await db.query(
            'INSERT INTO success_stories (quote, name, role, company, image, rating) VALUES (?, ?, ?, ?, ?, ?)',
            [quote, name, role, company, imagePath, rating]
        );
        res.status(201).json({ message: 'Success story created!', id: dbResult.insertId });
    } catch (err) {
        console.error('Error creating success story:', err);
        res.status(500).json({ error: 'Failed to create success story' });
    }
});

// PUT update story
router.put('/:id', upload.single('image'), async (req, res) => {
    const { quote, name, role, company, rating } = req.body;
    if (!quote || !name || !role || !company || !rating) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        const [existing] = await db.query('SELECT id, image FROM success_stories WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Story not found' });
        let query = 'UPDATE success_stories SET quote = ?, name = ?, role = ?, company = ?, rating = ?';
        const params = [quote, name, role, company, rating];
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'success_stories' },
                    (error, uploadResult) => {
                        if (error) return reject(error);
                        resolve(uploadResult);
                    }
                ).end(req.file.buffer);
            });
            query += ', image = ?';
            params.push(result.secure_url);
        }
        query += ' WHERE id = ?';
        params.push(req.params.id);
        await db.query(query, params);
        res.json({ message: 'Success story updated!' });
    } catch (err) {
        console.error('Error updating success story:', err);
        res.status(500).json({ error: 'Failed to update success story' });
    }
});

// DELETE story
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await db.query('SELECT image FROM success_stories WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Story not found' });
        if (existing[0].image) {
            const publicId = existing[0].image.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`success_stories/${publicId}`);
        }
        const [result] = await db.query('DELETE FROM success_stories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Success story deleted!' });
    } catch (err) {
        console.error('Error deleting success story:', err);
        res.status(500).json({ error: 'Failed to delete success story' });
    }
});

module.exports = router;