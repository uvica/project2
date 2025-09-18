// routes/consultations.js - Expert consultation booking routes
import express from 'express';
import db from '../db.js';
import { sendConsultationConfirmationEmail, sendAdminNotificationEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /api/consultations - Book a consultation
router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, meeting_date, meeting_time } = req.body;
    
    // Validate required fields
    if (!full_name || !email || !phone || !meeting_date || !meeting_time) {
      return res.status(400).json({ 
        error: 'All fields are required: full_name, email, phone, meeting_date, meeting_time' 
      });
    }
    
    // Validate phone number (exactly 10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ 
        error: 'Phone number must be exactly 10 digits' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please provide a valid email address' 
      });
    }
    
    // Validate date (not in past)
    const selectedDate = new Date(meeting_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return res.status(400).json({ 
        error: 'Meeting date cannot be in the past' 
      });
    }
    
    // Check if time slot is already booked for that date
    const [existingBookings] = await db.query(
      'SELECT id FROM consultations WHERE meeting_date = ? AND meeting_time = ? AND status != "cancelled"',
      [meeting_date, meeting_time]
    );
    
    if (existingBookings.length > 0) {
      return res.status(409).json({ 
        error: 'This time slot is already booked. Please choose a different time.' 
      });
    }
    
    // Insert new consultation booking
    const [result] = await db.query(
      'INSERT INTO consultations (full_name, email, phone, meeting_date, meeting_time) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone, meeting_date, meeting_time]
    );
    
    const consultation_id = result.insertId;
    
    // Prepare user details for email
    const userDetails = {
      full_name,
      email,
      phone,
      meeting_date,
      meeting_time,
      consultation_id
    };
    
    // Send confirmation email to user (don't wait for it to complete)
    sendConsultationConfirmationEmail(userDetails).catch(error => {
      console.error('Failed to send confirmation email:', error);
    });
    
    // Send notification email to admin (optional)
    sendAdminNotificationEmail(userDetails).catch(error => {
      console.error('Failed to send admin notification email:', error);
    });
    
    res.status(201).json({ 
      message: 'Consultation booked successfully! A confirmation email has been sent to your email address.',
      consultation_id,
      details: {
        full_name,
        email,
        meeting_date,
        meeting_time,
        status: 'pending'
      }
    });
    
  } catch (err) {
    console.error('Error booking consultation:', err);
    res.status(500).json({ 
      error: 'Failed to book consultation. Please try again.' 
    });
  }
});

// GET /api/consultations - Get all consultations (for admin)
router.get('/', async (req, res) => {
  try {
    const [consultations] = await db.query(
      'SELECT * FROM consultations ORDER BY created_at DESC'
    );
    
    res.json(consultations);
  } catch (err) {
    console.error('Error fetching consultations:', err);
    res.status(500).json({ 
      error: 'Failed to fetch consultations' 
    });
  }
});

// GET /api/consultations/:id - Get specific consultation
router.get('/:id', async (req, res) => {
  try {
    const consultationId = req.params.id;
    
    const [consultations] = await db.query(
      'SELECT * FROM consultations WHERE id = ?',
      [consultationId]
    );
    
    if (consultations.length === 0) {
      return res.status(404).json({ 
        error: 'Consultation not found' 
      });
    }
    
    res.json(consultations[0]);
  } catch (err) {
    console.error('Error fetching consultation:', err);
    res.status(500).json({ 
      error: 'Failed to fetch consultation' 
    });
  }
});

// PUT /api/consultations/:id/status - Update consultation status (for admin)
router.put('/:id/status', async (req, res) => {
  try {
    const consultationId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }
    
    const [result] = await db.query(
      'UPDATE consultations SET status = ? WHERE id = ?',
      [status, consultationId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: 'Consultation not found' 
      });
    }
    
    res.json({ 
      message: 'Consultation status updated successfully',
      consultation_id: consultationId,
      new_status: status
    });
    
  } catch (err) {
    console.error('Error updating consultation status:', err);
    res.status(500).json({ 
      error: 'Failed to update consultation status' 
    });
  }
});

export default router;
