// routes/consultations.js - Expert consultation booking routes
import express from 'express';
import db from '../db.js';
import { sendConsultationConfirmationEmail, sendAdminNotificationEmail } from '../utils/emailService.js';

const router = express.Router();

// CORS Preflight for all routes
router.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://talentconnects.onrender.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

// GET /api/consultations - Get all consultations
router.get('/', async (req, res) => {
    try {
        console.log('Fetching all consultations...');
        const [consultations] = await db.query(`
            SELECT * FROM consultations 
            ORDER BY created_at DESC
        `);
        
        console.log(`Found ${consultations.length} consultations`);
        res.json(consultations);
        
    } catch (error) {
        console.error('❌ Error fetching consultations:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to fetch consultations',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/consultations - Book a new consultation
router.post('/', async (req, res) => {
    try {
        const { full_name, email, phone, meeting_date, meeting_time } = req.body;
        console.log('📝 Received booking request:', { full_name, email, phone, meeting_date, meeting_time });

        // Validate required fields
        if (!full_name || !email || !phone || !meeting_date || !meeting_time) {
            console.warn('⚠️ Missing required fields');
            return res.status(400).json({ 
                error: 'All fields are required: full_name, email, phone, meeting_date, meeting_time' 
            });
        }

        // Validate phone (10 digits)
        if (!/^\d{10}$/.test(phone)) {
            console.warn('⚠️ Invalid phone number format');
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.warn('⚠️ Invalid email format');
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }

        // Validate date is not in the past
        const selectedDate = new Date(meeting_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            console.warn('⚠️ Meeting date is in the past');
            return res.status(400).json({ error: 'Meeting date cannot be in the past' });
        }

        // Check for existing bookings
        const [existingBookings] = await db.query(
            'SELECT id FROM consultations WHERE meeting_date = ? AND meeting_time = ? AND status != "cancelled"',
            [meeting_date, meeting_time]
        );
        
        if (existingBookings.length > 0) {
            console.warn('⚠️ Time slot already booked');
            return res.status(409).json({ 
                error: 'This time slot is already booked. Please choose a different time.' 
            });
        }

        // Start database transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Insert new consultation
            const [result] = await connection.query(
                'INSERT INTO consultations (full_name, email, phone, meeting_date, meeting_time) VALUES (?, ?, ?, ?, ?)',
                [full_name, email, phone, meeting_date, meeting_time]
            );

            const consultation_id = result.insertId;
            console.log('✅ Consultation saved with ID:', consultation_id);

            const userDetails = {
                full_name,
                email,
                phone,
                meeting_date,
                meeting_time,
                consultation_id
            };

            // Send emails in parallel
            const [userEmailResult, adminEmailResult] = await Promise.allSettled([
                sendConsultationConfirmationEmail(userDetails),
                sendAdminNotificationEmail(userDetails)
            ]);

            // Check email results
            if (userEmailResult.status === 'rejected') {
                console.error('❌ Failed to send user confirmation email:', userEmailResult.reason);
            }
            if (adminEmailResult.status === 'rejected') {
                console.error('❌ Failed to send admin notification:', adminEmailResult.reason);
            }

            // Commit transaction
            await connection.commit();
            connection.release();

            // Send success response
            res.status(201).json({
                success: true,
                message: 'Consultation booked successfully! A confirmation email has been sent.',
                consultation_id,
                details: {
                    full_name,
                    email,
                    meeting_date,
                    meeting_time,
                    status: 'pending'
                }
            });

        } catch (error) {
            // Rollback transaction on error
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('❌ Error creating consultation:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to book consultation',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// PUT /api/consultations/:id/status - Update consultation status
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ 
                error: 'Invalid status. Must be one of: pending, confirmed, completed, cancelled' 
            });
        }

        // Check if consultation exists
        const [consultation] = await db.query(
            'SELECT * FROM consultations WHERE id = ?', 
            [id]
        );

        if (consultation.length === 0) {
            return res.status(404).json({ error: 'Consultation not found' });
        }

        // Update status
        await db.query(
            'UPDATE consultations SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        res.json({ 
            success: true,
            message: `Consultation status updated to ${status}`,
            consultation_id: id,
            status
        });

    } catch (error) {
        console.error('Error updating consultation status:', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({ 
            success: false,
            error: 'Failed to update consultation status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;