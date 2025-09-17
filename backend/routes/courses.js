// routes/courses.js
import express from 'express';
import db from '../db.js';
const router = express.Router();

// GET all courses
router.get('/', async (req, res) => {
  try {
    const [courses] = await db.query('SELECT * FROM courses');
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET single course
router.get('/:id', async (req, res) => {
  try {
    const [courses] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (!courses.length) return res.status(404).json({ error: 'Course not found' });
    res.json(courses[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST create course
router.post('/', async (req, res) => {
  const { icon, title, description, full_description, duration, level, features } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const featuresString = Array.isArray(features) ? features.join(',') : features;
  const [result] = await db.query(
    'INSERT INTO courses (icon,title,description,full_description,duration,level,features) VALUES (?,?,?,?,?,?,?)',
    [icon,title,description,full_description,duration,level,featuresString]
  );
  res.status(201).json({ message:'Course created!', id: result.insertId });
});

// PUT update course
router.put('/:id', async (req, res) => {
  const { icon, title, description, full_description, duration, level, features } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const featuresString = Array.isArray(features) ? features.join(',') : features;
  await db.query(
    'UPDATE courses SET icon=?,title=?,description=?,full_description=?,duration=?,level=?,features=? WHERE id=?',
    [icon,title,description,full_description,duration,level,featuresString,req.params.id]
  );
  res.json({ message: 'Course updated!' });
});

// DELETE course
router.delete('/:id', async (req, res) => {
  const [result] = await db.query('DELETE FROM courses WHERE id=?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Course not found' });
  res.json({ message: 'Course deleted!' });
});

export default router;
