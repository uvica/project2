// routes/faqs.js
import express from 'express';
import db from '../db.js';
const router = express.Router();

// GET all FAQs
router.get('/', async (req, res) => {
  try {
    const [faqs] = await db.query('SELECT * FROM faqs');
    res.json(faqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single FAQ
router.get('/:id', async (req, res) => {
  try {
    const [faqs] = await db.query('SELECT * FROM faqs WHERE id=?', [req.params.id]);
    if (!faqs.length) return res.status(404).json({ error: 'FAQ not found' });
    res.json(faqs[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST create FAQ
router.post('/', async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Question & Answer required' });
  const [result] = await db.query('INSERT INTO faqs (question, answer) VALUES (?,?)', [question, answer]);
  res.status(201).json({ message: 'FAQ created!', id: result.insertId });
});

// PUT update FAQ
router.put('/:id', async (req, res) => {
  const { question, answer } = req.body;
  const [existing] = await db.query('SELECT id FROM faqs WHERE id=?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'FAQ not found' });
  await db.query('UPDATE faqs SET question=?, answer=? WHERE id=?', [question, answer, req.params.id]);
  res.json({ message: 'FAQ updated!' });
});

// DELETE FAQ
router.delete('/:id', async (req, res) => {
  const [result] = await db.query('DELETE FROM faqs WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'FAQ not found' });
  res.json({ message: 'FAQ deleted!' });
});

export default router;
