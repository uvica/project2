// utils/emailService.js - Email service for sending notifications
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter with Gmail SMTP (you can change this to other providers)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS  // Your email app password
    }
  });
};

// Send consultation confirmation email
export const sendConsultationConfirmationEmail = async (userDetails) => {
  try {
    const transporter = createTransporter();
    
    const { full_name, email, meeting_date, meeting_time, consultation_id } = userDetails;
    
    // Format the date for better readability
    const formattedDate = new Date(meeting_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format time for better readability
    const formattedTime = meeting_time;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirmation – CareerCraft Expert Session',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 10px; }
            .meeting-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4CAF50; }
            .join-link { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="content">
              <p><strong>Dear ${full_name},</strong></p>
              
              <p>Thank you for registering for a <strong>CareerCraft – Talk to Expert</strong> session with <strong>TalentConnect</strong>.</p>
              
              <p>We are pleased to confirm your appointment.</p>
              
              <div class="meeting-details">
                <p><strong>📅 Date:</strong> ${formattedDate}</p>
                <p><strong>⏰ Time:</strong> ${formattedTime}</p>
                <p><strong>📍 Mode:</strong> Online (Google Meet)</p>
                <p><strong>🔗 Join Link:</strong> <a href="https://meet.google.com/yrb-ugcy-dvo" class="join-link">https://meet.google.com/yrb-ugcy-dvo</a></p>
              </div>
              
              <p>During this session, our expert will guide you in choosing the best course aligned with your strengths, interests, and career goals.</p>
              
              <p>We look forward to connecting with you and helping you take the next step in your career journey.</p>
              
              <p><strong>Best regards,</strong></p>
              <p><strong>Team TalentConnect CareerCraft</strong></p>
            </div>
            <div class="footer">
              <p><em>From Campus to Cubicle</em></p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 ✅ CONSULTATION CONFIRMATION EMAIL SENT SUCCESSFULLY!');
    console.log('📤 To:', email);
    console.log('👤 Recipient:', full_name);
    console.log('📅 Meeting Date:', meeting_date);
    console.log('⏰ Meeting Time:', meeting_time);
    console.log('🆔 Message ID:', info.messageId);
    console.log('📋 Subject: Confirmation – CareerCraft Expert Session');
    console.log('─'.repeat(60));
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.log('📧 ❌ CONSULTATION CONFIRMATION EMAIL FAILED!');
    console.log('📤 Failed To:', email);
    console.log('👤 Recipient:', full_name);
    console.log('❌ Error:', error.message);
    console.log('─'.repeat(60));
    return { success: false, error: error.message };
  }
};

// Send admin notification email (optional - to notify admin of new bookings)
export const sendAdminNotificationEmail = async (userDetails) => {
  try {
    const transporter = createTransporter();
    
    const { full_name, email, phone, meeting_date, meeting_time, consultation_id } = userDetails;
    
    const formattedDate = new Date(meeting_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Admin email
      subject: `New Consultation Booking - ${full_name}`,
      html: `
        <h2>New Consultation Booking</h2>
        <p><strong>Booking ID:</strong> #${consultation_id}</p>
        <p><strong>Client Name:</strong> ${full_name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${meeting_time}</p>
        <p><strong>Status:</strong> Pending Confirmation</p>
        
        <p>Please review and confirm this booking in the admin dashboard.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 ✅ ADMIN NOTIFICATION EMAIL SENT SUCCESSFULLY!');
    console.log('📤 To Admin:', process.env.ADMIN_EMAIL || process.env.EMAIL_USER);
    console.log('👤 New Booking From:', full_name);
    console.log('📧 Client Email:', email);
    console.log('📞 Client Phone:', phone);
    console.log('📅 Meeting Date:', meeting_date);
    console.log('⏰ Meeting Time:', meeting_time);
    console.log('🆔 Booking ID:', consultation_id);
    console.log('🆔 Message ID:', info.messageId);
    console.log('📋 Subject: New Consultation Booking -', full_name);
    console.log('─'.repeat(60));
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.log('📧 ❌ ADMIN NOTIFICATION EMAIL FAILED!');
    console.log('📤 Failed To Admin:', process.env.ADMIN_EMAIL || process.env.EMAIL_USER);
    console.log('👤 Booking From:', full_name);
    console.log('❌ Error:', error.message);
    console.log('─'.repeat(60));
    return { success: false, error: error.message };
  }
};

export default {
  sendConsultationConfirmationEmail,
  sendAdminNotificationEmail
};
