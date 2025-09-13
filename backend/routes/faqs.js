const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all FAQs
router.get('/', async (req, res) => {
    try {
        const [faqs] = await db.query('SELECT * FROM faqs');
        res.json(faqs);
    } catch (err) {
        console.error('Error fetching FAQs:', err);
        res.status(500).json({ error: 'Failed to fetch FAQs: ' + err.message });
    }
});

// GET single FAQ
router.get('/:id', async (req, res) => {
    try {
        const [faqs] = await db.query('SELECT * FROM faqs WHERE id = ?', [req.params.id]);
        if (faqs.length === 0) {
            return res.status(404).json({ error: 'FAQ not found' });
        }
        res.json(faqs[0]);
    } catch (err) {
        console.error('Error fetching FAQ:', err);
        res.status(500).json({ error: 'Failed to fetch FAQ: ' + err.message });
    }
});

// POST new FAQ
router.post('/', async (req, res) => {
    const { question, answer } = req.body;
    try {
        if (!question || !answer) {
            return res.status(400).json({ error: 'Question and answer are required' });
        }
        const [result] = await db.query(
            'INSERT INTO faqs (question, answer) VALUES (?, ?)',
            [question, answer]
        );
        res.status(201).json({ message: 'FAQ created!', id: result.insertId });
    } catch (err) {
        console.error('Error creating FAQ:', err);
        res.status(500).json({ error: 'Failed to create FAQ: ' + err.message });
    }
});

// UPDATE FAQ
router.put('/:id', async (req, res) => {
    const { question, answer } = req.body;
    try {
        const [existing] = await db.query('SELECT id FROM faqs WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'FAQ not found' });
        }
        await db.query(
            'UPDATE faqs SET question = ?, answer = ? WHERE id = ?',
            [question, answer, req.params.id]
        );
        res.json({ message: 'FAQ updated!' });
    } catch (err) {
        console.error('Error updating FAQ:', err);
        res.status(500).json({ error: 'Failed to update FAQ: ' + err.message });
    }
});

// DELETE FAQ
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM faqs WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'FAQ not found' });
        }
        res.json({ message: 'FAQ deleted!' });
    } catch (err) {
        console.error('Error deleting FAQ:', err);
        res.status(500).json({ error: 'Failed to delete FAQ: ' + err.message });
    }
});

module.exports = router;
