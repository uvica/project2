// routes/admins.js
import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
const router = express.Router();

// GET all admins
router.get('/', async (req, res) => {
  const [admins] = await db.query('SELECT id,email FROM admins');
  res.json(admins);
});

// POST create admin
router.post('/', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & Password required' });

  const [existing] = await db.query('SELECT id FROM admins WHERE email=?', [email]);
  if (existing.length) return res.status(400).json({ error: 'Email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query('INSERT INTO admins (email,password) VALUES (?,?)', [email, hash]);
  res.status(201).json({ message:'Admin created!', id: result.insertId });
});

// POST login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & Password required' });

  const [admins] = await db.query('SELECT * FROM admins WHERE email=?', [email]);
  if (!admins.length) return res.status(401).json({ error:'Invalid email/password' });

  const admin = admins[0];
  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(401).json({ error:'Invalid email/password' });

  res.json({ message:'Login successful', id: admin.id });
});

export default router;
