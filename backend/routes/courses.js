const express = require('express');
const router = express.Router();
const db = require('../db');
// GET all courses
router.get('/', async (req, res) => {
    try {
        const [courses] = await db.query('SELECT * FROM courses');
        // Convert features string to array if stored as comma-separated
        const formattedCourses = courses.map(course => ({
            ...course,
            features: course.features ? course.features.split(',') : []
        }));
        res.json(formattedCourses);
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ error: 'Failed to fetch courses: ' + err.message });
    }
});

// GET single course
router.get('/:id', async (req, res) => {
    try {
        const [courses] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
        if (courses.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        const course = courses[0];
        course.features = course.features ? course.features.split(',') : [];
        res.json(course);
    } catch (err) {
        console.error('Error fetching course:', err);
        res.status(500).json({ error: 'Failed to fetch course: ' + err.message });
    }
});

// POST new course
router.post('/', async (req, res) => {
    const { icon, title, description, full_description, duration, level, features } = req.body;
    try {
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        const featuresString = Array.isArray(features) ? features.join(',') : features;
        const [result] = await db.query(
            'INSERT INTO courses (icon, title, description, full_description, duration, level, features) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [icon, title, description, full_description, duration, level, featuresString]
        );
        res.status(201).json({ message: 'Course created!', id: result.insertId });
    } catch (err) {
        console.error('Error creating course:', err);
        res.status(500).json({ error: 'Failed to create course: ' + err.message });
    }
});

// UPDATE course
router.put('/:id', async (req, res) => {
    const { icon, title, description, full_description, duration, level, features } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    try {
        const [existing] = await db.query('SELECT id FROM courses WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        const featuresString = Array.isArray(features) ? features.join(',') : features;
        await db.query(
            'UPDATE courses SET icon = ?, title = ?, description = ?, full_description = ?, duration = ?, level = ?, features = ? WHERE id = ?',
            [icon, title, description, full_description, duration, level, featuresString, req.params.id]
        );
        res.json({ message: 'Course updated!' });
    } catch (err) {
        console.error('Error updating course:', err);
        res.status(500).json({ error: 'Failed to update course: ' + err.message });
    }
});

// DELETE course
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted!' });
    } catch (err) {
        
        console.error('Error deleting course:', err);
        res.status(500).json({ error: 'Failed to delete course: ' + err.message });
    }
});

module.exports = router;