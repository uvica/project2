const fs = require('fs');
const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage (temporary)
const storage = multer.memoryStorage();
const upload = multer({ storage });
const uploadMiddleware = upload.single('logo');

// GET all partners
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, logo_path FROM partners ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching partners:', err);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// POST create new partner
router.post('/', uploadMiddleware, async (req, res) => {
    const { name } = req.body;
    if (!name || !req.file) {
        return res.status(400).json({ error: 'Name and logo are required' });
    }

    try {
        const result = await cloudinary.uploader.upload_stream(
            { folder: 'partners' },
            async (error, uploadResult) => {
                if (error) throw new Error(error.message);
                const logoPath = uploadResult.secure_url;
                const [dbResult] = await db.query(
                    'INSERT INTO partners (name, logo_path) VALUES (?, ?)',
                    [name, logoPath]
                );
                res.status(201).json({ message: 'Partner added!', id: dbResult.insertId });
            }
        ).end(req.file.buffer);
    } catch (err) {
        console.error('Error adding partner:', err);
        res.status(500).json({ error: 'Failed to add partner' });
    }
});

// PUT update partner
router.put('/:id', uploadMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        const [existing] = await db.query('SELECT id, logo_path FROM partners WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        let query = 'UPDATE partners SET name = ?';
        const params = [name];
        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'partners' },
                    (error, uploadResult) => {
                        if (error) return reject(error);
                        resolve(uploadResult);
                    }
                ).end(req.file.buffer);
            });
            query += ', logo_path = ?';
            params.push(result.secure_url);
        }
        query += ' WHERE id = ?';
        params.push(req.params.id);
        await db.query(query, params);
        res.json({ message: 'Partner updated!' });
    } catch (err) {
        console.error('Error updating partner:', err);
        res.status(500).json({ error: 'Failed to update partner' });
    }
});
// DELETE partner
router.delete('/:id', async (req, res) => {
    try {
        const [existing] = await db.query('SELECT logo_path FROM partners WHERE id = ?', [req.params.id]);
        const [result] = await db.query('DELETE FROM partners WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Partner not found' });
        res.json({ message: 'Partner deleted!' });
    } catch (err) {
        console.error('Error deleting partner:', err);
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

module.exports = router;