// utils/emailService.js
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY is not set in environment variables');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized');
}

/**
 * Send a consultation confirmation email to the user
 * @param {Object} userDetails - User information
 * @param {string} userDetails.email - Recipient's email (required)
 * @param {string} userDetails.full_name - Recipient's name
 * @param {string} userDetails.meeting_date - Meeting date
 * @param {string} userDetails.meeting_time - Meeting time
 * @param {string} userDetails.phone - User's phone number
 * @param {number} userDetails.consultation_id - Consultation ID
 * @returns {Promise<Object>} Result of the email sending operation
 */
export const sendConsultationConfirmationEmail = async (userDetails) => {
  const logPrefix = '✉️ [User Confirmation]';
  console.log(`${logPrefix} Starting email to: ${userDetails?.email || 'No email provided'}`);

  // Input validation
  if (!userDetails?.email) {
    const error = new Error('No email provided in userDetails');
    console.error(`${logPrefix} Validation failed:`, error.message);
    throw error;
  }

  try {
    const formattedDate = userDetails.meeting_date
      ? new Date(userDetails.meeting_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Date not specified';

    const msg = {
      to: userDetails.email,
      from: {
        email: process.env.EMAIL_FROM,
        name: 'TalentConnect'
      },
      subject: 'Consultation Confirmation – CareerCraft Expert Session',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Your Consultation is Confirmed!</h2>
          <p>Hello <strong>${userDetails.full_name || 'there'}</strong>,</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>📅 Date:</strong> ${formattedDate}</p>
            <p><strong>⏰ Time:</strong> ${userDetails.meeting_time || 'Not specified'}</p>
            <p><strong>📍 Mode:</strong> Online (Google Meet)</p>
            <p><strong>🔗 Join Link:</strong> <a href="https://meet.google.com/yrb-ugcy-dvo" target="_blank">Join Meeting</a></p>
          </div>
          
          <p>We're excited to guide you in choosing the best course aligned with your career goals.</p>
          
          <p>Best regards,<br><strong>The TalentConnect Team</strong></p>
        </div>
      `,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true }
      }
    };

    console.log(`${logPrefix} Sending to: ${msg.to}, From: ${msg.from.email}`);
    
    const response = await sgMail.send(msg);
    console.log(`${logPrefix} ✅ Success! Message ID:`, response[0]?.headers?.['x-message-id']);
    
    return {
      success: true,
      messageId: response[0]?.headers?.['x-message-id'],
      statusCode: response[0]?.statusCode
    };

  } catch (error) {
    console.error(`${logPrefix} ❌ Failed to send email:`, {
      error: error.message,
      code: error.code,
      response: error.response?.body || 'No response body',
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Send admin notification about new consultation
 * @param {Object} userDetails - User and consultation details
 * @param {string} userDetails.full_name - User's full name
 * @param {string} userDetails.email - User's email
 * @param {string} userDetails.phone - User's phone number
 * @param {string} userDetails.meeting_date - Meeting date
 * @param {string} userDetails.meeting_time - Meeting time
 * @param {number} userDetails.consultation_id - Consultation ID
 * @returns {Promise<Object>} Result of the email sending operation
 */
export const sendAdminNotificationEmail = async (userDetails) => {
  const logPrefix = '📧 [Admin Notification]';
  
  if (!process.env.ADMIN_EMAIL) {
    const message = 'ADMIN_EMAIL not configured';
    console.log(`${logPrefix} ${message}`);
    return { success: false, message };
  }

  console.log(`${logPrefix} Preparing notification for admin: ${process.env.ADMIN_EMAIL}`);

  try {
    const formattedDate = userDetails.meeting_date
      ? new Date(userDetails.meeting_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'Date not specified';

    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: {
        email: process.env.EMAIL_FROM,
        name: 'TalentConnect Notifications'
      },
      subject: `New Consultation: ${userDetails.full_name || 'New User'}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3>New Consultation Scheduled</h3>
          <p><strong>Name:</strong> ${userDetails.full_name || 'Not provided'}</p>
          <p><strong>Email:</strong> ${userDetails.email || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${userDetails.phone || 'Not provided'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${userDetails.meeting_time || 'Not specified'}</p>
          <p><strong>Consultation ID:</strong> ${userDetails.consultation_id || 'N/A'}</p>
          <p><strong>Status:</strong> <em>Pending Confirmation</em></p>
        </div>
      `
    };

    console.log(`${logPrefix} Sending to admin: ${msg.to}`);
    const response = await sgMail.send(msg);
    console.log(`${logPrefix} ✅ Notification sent successfully!`);
    
    return {
      success: true,
      messageId: response[0]?.headers?.['x-message-id'],
      statusCode: response[0]?.statusCode
    };

  } catch (error) {
    console.error(`${logPrefix} ❌ Failed to send admin notification:`, {
      error: error.message,
      code: error.code,
      response: error.response?.body || 'No response body',
      stack: error.stack
    });
    // Don't throw to avoid breaking the main flow
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// Remove the default export and only use named exports
export default {
  sendConsultationConfirmationEmail,
  sendAdminNotificationEmail
};