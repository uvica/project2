// routes/consultations.js - Expert consultation booking routes
import express from 'express';
import db from '../db.js';
import { sendConsultationConfirmationEmail, sendAdminNotificationEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /api/consultations - Book a consultation
router.post('/', async (req, res) => {
  try {
    const { full_name, email, phone, meeting_date, meeting_time } = req.body;
    console.log('📝 Received booking request:', req.body);

    // Validate required fields
    if (!full_name || !email || !phone || !meeting_date || !meeting_time) {
      console.warn('⚠️ Missing required fields');
      return res.status(400).json({ 
        error: 'All fields are required: full_name, email, phone, meeting_date, meeting_time' 
      });
    }

    // Validate phone
    if (!/^\d{10}$/.test(phone)) {
      console.warn('⚠️ Invalid phone number:', phone);
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('⚠️ Invalid email:', email);
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    // Validate date
    const selectedDate = new Date(meeting_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      console.warn('⚠️ Meeting date in past:', meeting_date);
      return res.status(400).json({ error: 'Meeting date cannot be in the past' });
    }

    // Check if time slot is already booked
    const [existingBookings] = await db.query(
      'SELECT id FROM consultations WHERE meeting_date = ? AND meeting_time = ? AND status != "cancelled"',
      [meeting_date, meeting_time]
    );
    if (existingBookings.length > 0) {
      console.warn('⚠️ Time slot already booked:', meeting_date, meeting_time);
      return res.status(409).json({ error: 'This time slot is already booked. Please choose a different time.' });
    }

    // Insert new consultation
    const [result] = await db.query(
      'INSERT INTO consultations (full_name, email, phone, meeting_date, meeting_time) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone, meeting_date, meeting_time]
    );
    const consultation_id = result.insertId;
    console.log('✅ Consultation saved in DB, ID:', consultation_id);

    const userDetails = { full_name, email, phone, meeting_date, meeting_time, consultation_id };

    // Send confirmation email
    console.log('📨 Sending user confirmation email to:', email);
    sendConsultationConfirmationEmail(userDetails)
      .then(() => console.log('✅ User confirmation email sent'))
      .catch(error => console.error('❌ Failed to send user confirmation email:', error));

    // Send admin notification (optional)
    console.log('📨 Sending admin notification email');
    sendAdminNotificationEmail(userDetails)
      .then(() => console.log('✅ Admin notification email sent'))
      .catch(error => console.error('❌ Failed to send admin notification email:', error));

    res.status(201).json({ 
      message: 'Consultation booked successfully! A confirmation email has been sent to your email address.',
      consultation_id,
      details: { full_name, email, meeting_date, meeting_time, status: 'pending' }
    });

  } catch (err) {
    console.error('❌ Error booking consultation:', err);
    res.status(500).json({ error: 'Failed to book consultation. Please try again.' });
  }
});

export default router;
