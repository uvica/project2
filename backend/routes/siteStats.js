const express = require('express');
const router = express.Router();
const db = require('../db');

// GET latest site stats
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM site_stats ORDER BY id DESC LIMIT 1');
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            // Return default values if no data exists
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
        }
    } catch (err) {
        console.error('Error fetching site stats:', err);
        res.status(500).json({ error: 'Failed to fetch site stats' });
    }
});

// POST to insert or update site stats
router.post('/', async (req, res) => {
    try {
        const {
            program_duration, course_tracks, placement_rate, industry_mentors,
            min_stipend, max_stipend, alumni_network, partner_companies,
            average_rating, avg_package, highest_package, success_rate,
            hands_on_projects, job_placement_guarantee, active_alumni_network,
            internship_placement, convert_to_full_time, avg_job_placement_time,
            average_starting_salary, internship_stipend
        } = req.body;

        // Basic validation
        if (!program_duration || !course_tracks || !placement_rate || !industry_mentors) {
            return res.status(400).json({ error: 'Program duration, course tracks, placement rate, and industry mentors are required' });
        }

        // Check if a record already exists
        const [rows] = await db.query('SELECT id FROM site_stats ORDER BY id DESC LIMIT 1');
        
        if (rows.length > 0) {
            // Update existing record
            const updateQuery = `
                UPDATE site_stats SET 
                    program_duration = ?, course_tracks = ?, placement_rate = ?, industry_mentors = ?,
                    min_stipend = ?, max_stipend = ?, alumni_network = ?, partner_companies = ?,
                    average_rating = ?, avg_package = ?, highest_package = ?, success_rate = ?,
                    hands_on_projects = ?, job_placement_guarantee = ?, active_alumni_network = ?,
                    internship_placement = ?, convert_to_full_time = ?, avg_job_placement_time = ?,
                    average_starting_salary = ?, internship_stipend = ?
                WHERE id = ?
            `;
            
            await db.query(updateQuery, [
                program_duration, course_tracks, placement_rate, industry_mentors,
                min_stipend, max_stipend, alumni_network, partner_companies,
                average_rating, avg_package, highest_package, success_rate,
                hands_on_projects, job_placement_guarantee, active_alumni_network,
                internship_placement, convert_to_full_time, avg_job_placement_time,
                average_starting_salary, internship_stipend, rows[0].id
            ]);
            
            res.json({ message: 'Site stats updated successfully!' });
        } else {
            // Insert new record
            const insertQuery = `
                INSERT INTO site_stats (
                    program_duration, course_tracks, placement_rate, industry_mentors,
                    min_stipend, max_stipend, alumni_network, partner_companies,
                    average_rating, avg_package, highest_package, success_rate,
                    hands_on_projects, job_placement_guarantee, active_alumni_network,
                    internship_placement, convert_to_full_time, avg_job_placement_time,
                    average_starting_salary, internship_stipend
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.query(insertQuery, [
                program_duration, course_tracks, placement_rate, industry_mentors,
                min_stipend, max_stipend, alumni_network, partner_companies,
                average_rating, avg_package, highest_package, success_rate,
                hands_on_projects, job_placement_guarantee, active_alumni_network,
                internship_placement, convert_to_full_time, avg_job_placement_time,
                average_starting_salary, internship_stipend
            ]);
            
            res.json({ message: 'Site stats saved successfully!', id: result.insertId });
        }
    } catch (err) {
        console.error('Error saving site stats:', err);
        res.status(500).json({ error: 'Failed to save site stats' });
    }
});

module.exports = router;