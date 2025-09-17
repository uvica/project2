// routes/site_stats.js
import express from 'express';
import db from '../db.js';
const router = express.Router();

// GET latest site stats
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM site_stats ORDER BY id DESC LIMIT 1');
    if (rows.length) return res.json(rows[0]);
    // default values if no data
    res.json({
      program_duration: '3 Months',
      course_tracks: '8+',
      placement_rate: '100%',
      industry_mentors: '50+',
      min_stipend: '₹15K',
      max_stipend: '₹35K',
      alumni_network: '500+',
      partner_companies: '200+',
      average_rating: '4.9/5',
      avg_package: '₹12.5L',
      highest_package: '₹45L',
      success_rate: '95%',
      hands_on_projects: '10+',
      job_placement_guarantee: '100%',
      active_alumni_network: '500+',
      internship_placement: '100%',
      convert_to_full_time: '85%',
      avg_job_placement_time: '2 Weeks',
      average_starting_salary: '₹8.5L',
      internship_stipend: '₹15K-₹35K'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST insert or update site stats
router.post('/', async (req, res) => {
  try {
    // Read actual table columns to avoid unknown-column errors
    const [cols] = await db.query('SHOW COLUMNS FROM site_stats');
    const existingColumns = new Set(cols.map(c => c.Field));

    const incoming = req.body || {};
    const data = Object.fromEntries(
      Object.entries(incoming).filter(([k]) => existingColumns.has(k))
    );

    const [existing] = await db.query('SELECT id FROM site_stats ORDER BY id DESC LIMIT 1');

    if (existing.length) {
      const id = existing[0].id;
      if (Object.keys(data).length === 0) return res.json({ message: 'No matching fields to update' });
      const fields = Object.keys(data).map(k => `${k}=?`).join(',');
      const params = [...Object.values(data), id];
      await db.query(`UPDATE site_stats SET ${fields} WHERE id=?`, params);
      res.json({ message: 'Site stats updated!' });
    } else {
      if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No matching fields provided' });
      const keys = Object.keys(data).join(',');
      const placeholders = Object.keys(data).map(() => '?').join(',');
      const values = Object.values(data);
      const [result] = await db.query(`INSERT INTO site_stats (${keys}) VALUES (${placeholders})`, values);
      res.json({ message: 'Site stats saved!', id: result.insertId });
    }
  } catch (err) {
    console.error('site_stats POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
