// routes/siteStats.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Default stats that will be used if database doesn't have the values
const defaultStats = {
    program_duration: '3 Months',
    course_tracks: '8+',
    placement_rate: '100%',
    industry_mentors: '50+',
    min_stipend: '₹15K',
    max_stipend: '₹35K',
    alumni_network: '500+',
    partner_companies: '500+',
    average_rating: '4.9/5',
    avg_package: '₹12.5L',
    highest_package: '₹45L',
    success_rate: '95%',
    hands_on_projects: '25+',
    job_placement_guarantee: '100%',
    active_alumni_network: '500+',
    internship_placement: '100%',
    convert_to_full_time: '85%',
    avg_job_placement_time: '2 Weeks',
    average_starting_salary: '₹8.5L',
    internship_stipend: '₹15k-35k'
};

// GET latest site stats
router.get('/', async (req, res) => {
    try {
        let dbStats = {};
        
        try {
            const [rows] = await db.query('SELECT * FROM site_stats ORDER BY id DESC LIMIT 1');
            if (rows && rows[0]) {
                dbStats = rows[0];
            }
        } catch (dbError) {
            console.warn('Database query failed:', dbError.message);
        }

        // Merge database stats with defaults (database values take precedence)
        const mergedStats = { ...defaultStats, ...dbStats };
        
        res.json(mergedStats);
    } catch (err) {
        console.error('Error fetching site stats:', err);
        // Return default stats as fallback
        res.json(defaultStats);
    }
});

// POST to insert or update site stats
router.post('/', async (req, res) => {
    try {
        // Get all possible fields from request body, use defaults if not provided
        const statsData = {};
        Object.keys(defaultStats).forEach(key => {
            statsData[key] = req.body[key] || defaultStats[key];
        });

        // Check if a row already exists
        const [rows] = await db.query('SELECT id FROM site_stats ORDER BY id DESC LIMIT 1');

        if (rows && rows[0]) {
            // Update existing row - only update columns that exist in the table
            const updateFields = [];
            const updateValues = [];
            
            // Only include columns that exist in your current table structure
            const existingColumns = [
                'program_duration', 'course_tracks', 'placement_rate', 'industry_mentors',
                'min_stipend', 'max_stipend', 'alumni_network', 'partner_companies',
                'average_rating'
            ];
            
            existingColumns.forEach(col => {
                if (statsData[col] !== undefined) {
                    updateFields.push(`${col}=?`);
                    updateValues.push(statsData[col]);
                }
            });
            
            updateValues.push(rows[0].id);
            
            await db.query(
                `UPDATE site_stats SET ${updateFields.join(', ')} WHERE id=?`,
                updateValues
            );
            
            res.json({ message: 'Site stats updated successfully!' });
        } else {
            // Insert new row - only insert columns that exist in the table
            const insertFields = [];
            const insertPlaceholders = [];
            const insertValues = [];
            
            const existingColumns = [
                'program_duration', 'course_tracks', 'placement_rate', 'industry_mentors',
                'min_stipend', 'max_stipend', 'alumni_network', 'partner_companies',
                'average_rating'
            ];
            
            existingColumns.forEach(col => {
                if (statsData[col] !== undefined) {
                    insertFields.push(col);
                    insertPlaceholders.push('?');
                    insertValues.push(statsData[col]);
                }
            });
            
            const [result] = await db.query(
                `INSERT INTO site_stats (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`,
                insertValues
            );
            
            res.json({ message: 'Site stats saved successfully!', id: result.insertId });
        }
    } catch (err) {
        console.error('Error saving site stats:', err);
        res.status(500).json({ error: 'Failed to save site stats. Please check your database connection and table structure.' });
    }
});

module.exports = router;