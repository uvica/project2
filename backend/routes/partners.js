// routes/partners.js
import express from 'express';
import db from '../db.js';
import { createUploader } from '../config/cloudinary.js';
const router = express.Router();
const upload = createUploader('partners');

// GET all partners
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM partners ORDER BY id DESC');
    const partners = rows.map(row => {
      let raw = row.logo_path || row.logo || null;
      if (raw) {
        // Normalize backslashes and trim
        let s = String(raw).trim().replace(/\\/g, '/');
        // Extract from '/uploads' (or 'uploads') onward
        const idx = s.toLowerCase().indexOf('/uploads/') >= 0 ? s.toLowerCase().indexOf('/uploads/') : s.toLowerCase().indexOf('uploads/');
        if (idx >= 0) {
          s = '/' + s.slice(idx).replace(/^\/+/, '');
        } else if (!/^https?:\/\//i.test(s)) {
          // Fallback: enforce leading slash for relative paths
          if (!s.startsWith('/')) s = '/' + s;
        }
        raw = s;
      }
      return {
        id: row.id,
        name: row.name,
        logo_path: raw
      };
    });
    res.json(partners);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST create partner
router.post('/', upload.single('logo'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    // Determine available columns
    const [cols] = await db.query('SHOW COLUMNS FROM partners');
    const existingColumns = new Set(cols.map(c => c.Field));

    // Normalize stored logo path if file provided
    let storedPath = null;
    if (req.file) {
      const fullPath = req.file.path;
      try {
        // Convert absolute path to relative served path (uploads/...)
        const pathMod = (await import('path')).default;
        const rel = pathMod.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        storedPath = rel.startsWith('uploads/') ? rel : `uploads/${rel.split('/').slice(-2).join('/')}`;
      } catch {
        storedPath = fullPath;
      }
    }

    if (storedPath && existingColumns.has('logo_path')) {
      const [result] = await db.query('INSERT INTO partners (name, logo_path) VALUES (?,?)', [name, storedPath]);
      return res.status(201).json({ message: 'Partner added!', id: result.insertId });
    }
    if (storedPath && existingColumns.has('logo')) {
      const [result] = await db.query('INSERT INTO partners (name, logo) VALUES (?,?)', [name, storedPath]);
      return res.status(201).json({ message: 'Partner added!', id: result.insertId });
    }
    // If no logo column exists, try to add a nullable logo_path column
    if (storedPath && !existingColumns.has('logo_path') && !existingColumns.has('logo')) {
      try {
        await db.query('ALTER TABLE partners ADD COLUMN logo_path VARCHAR(512) NULL');
        const [ins] = await db.query('INSERT INTO partners (name, logo_path) VALUES (?,?)', [name, storedPath]);
        return res.status(201).json({ message: 'Partner added!', id: ins.insertId });
      } catch (alterErr) {
        console.warn('ALTER TABLE partners add logo_path failed:', alterErr.message);
      }
    }
    // Insert name only as last resort
    const [result] = await db.query('INSERT INTO partners (name) VALUES (?)', [name]);
    return res.status(201).json({ message: 'Partner added (name only).', id: result.insertId });
  } catch (err) {
    // If table does not exist, create it and retry once
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      try {
        await db.query(`CREATE TABLE partners (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          logo_path VARCHAR(512) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        const storedPath = req.file ? req.file.path : null;
        const [ins] = await db.query(
          storedPath ? 'INSERT INTO partners (name, logo_path) VALUES (?,?)' : 'INSERT INTO partners (name) VALUES (?)',
          storedPath ? [name, storedPath] : [name]
        );
        return res.status(201).json({ message: 'Partner added!', id: ins.insertId });
      } catch (createErr) {
        console.error('Partner table create error:', createErr);
        return res.status(500).json({ error: createErr.message });
      }
    }
    console.error('Partner create error:', err);
    return res.status(500).json({ error: err.message, code: err.code, sqlMessage: err.sqlMessage });
  }
});

// PUT update partner
router.put('/:id', upload.single('logo'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    // Check what columns exist in the partners table
    const [cols] = await db.query('SHOW COLUMNS FROM partners');
    const existingColumns = new Set(cols.map(c => c.Field));
    
    let query = 'UPDATE partners SET name=?';
    const params = [name];
    
    if (req.file) {
      if (existingColumns.has('logo_path')) {
        query += ', logo_path=?';
        params.push(req.file.path);
      } else if (existingColumns.has('logo')) {
        query += ', logo=?';
        params.push(req.file.path);
      }
    }
    
    query += ' WHERE id=?';
    params.push(req.params.id);
    
    await db.query(query, params);
    res.json({ message: 'Partner updated!' });
  } catch (err) {
    console.error('Partner update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE partner
router.delete('/:id', async (req, res) => {
  const [result] = await db.query('DELETE FROM partners WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Partner not found' });
  res.json({ message: 'Partner deleted!' });
});

export default router;
