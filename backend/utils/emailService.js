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
/**
 * Send a welcome email to newly registered users
 * @param {Object} userDetails - User information
 * @param {string} userDetails.email - Recipient's email (required)
 * @param {string} userDetails.full_name - Recipient's name
 * @returns {Promise<Object>} Result of the email sending operation
 */
export const sendWelcomeEmail = async (userDetails) => {
  const logPrefix = '✉️ [Welcome Email]';
  console.log(`${logPrefix} Sending welcome email to: ${userDetails?.email || 'No email provided'}`);

  // Input validation
  if (!userDetails?.email) {
    const error = new Error('No email provided in userDetails');
    console.error(`${logPrefix} Validation failed:`, error.message);
    throw error;
  }

  try {
    const msg = {
      to: userDetails.email,
      from: {
        email: process.env.EMAIL_FROM,
        name: 'TalentConnect CareerCraft'
      },
      subject: 'Welcome to TalentConnect CareerCraft – Your Journey Begins 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to TalentConnect CareerCraft!</h1>
            <p style="font-size: 20px; color: #4b5563;">Your Journey Begins 🚀</p>
          </div>
          
          <p>Dear ${userDetails.full_name || 'Valued User'},</p>
          
          <p>We are excited to welcome you to the <strong>TalentConnect CareerCraft Program!</strong> 🎉</p>
          
          <p>You've successfully registered for your chosen course, and your journey with us will follow this structured path:</p>
          
          <h3 style="color: #2563eb; margin-top: 25px;">📌 Program Flow:</h3>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-weight: bold; color: #1e40af;">Month 1: Learn</p>
            <p>Gain in-depth knowledge and skills from experts.</p>
            
            <p style="font-weight: bold; color: #1e40af; margin-top: 15px;">Month 2: Build</p>
            <p>Work on real-world projects to sharpen your practical expertise.</p>
            
            <p style="font-weight: bold; color: #1e40af; margin-top: 15px;">Month 3: Release</p>
            <p>Showcase your final project and get evaluated.</p>
          </div>
          
          <p>After completing this 3-month course, you'll step into a 3-month paid internship, where you'll apply your skills in a professional setting. Based on your performance, your internship may convert into a full-time role.</p>
          
          <p>We'll share your batch start date, orientation details, and joining instructions with you shortly. Please stay tuned.</p>
          
          <p>At TalentConnect, we believe in not just teaching but unlocking your potential and building a bridge from learning to earning.</p>
          
          <p>For any queries, feel free to reach us at <a href="mailto:support@talentconnect.com" style="color: #2563eb; text-decoration: none;">support@talentconnect.com</a> or call us at +1 (555) 123-4567.</p>
          
          <p>We look forward to seeing you grow with us!</p>
          
          <p>Best Regards,<br>
          <strong>Team TalentConnect</strong><br>
          <em style="color: #4b5563;">Your Talent, Unlocked. Your Future, Unstoppable.</em></p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} TalentConnect. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Welcome to TalentConnect CareerCraft – Your Journey Begins 🚀

Dear ${userDetails.full_name || 'Valued User'},

We are excited to welcome you to the TalentConnect CareerCraft Program! 🎉

You've successfully registered for your chosen course, and your journey with us will follow this structured path:

📌 Program Flow:

Month 1: Learn
Gain in-depth knowledge and skills from experts.

Month 2: Build
Work on real-world projects to sharpen your practical expertise.

Month 3: Release
Showcase your final project and get evaluated.

After completing this 3-month course, you'll step into a 3-month paid internship, where you'll apply your skills in a professional setting. Based on your performance, your internship may convert into a full-time role.

We'll share your batch start date, orientation details, and joining instructions with you shortly. Please stay tuned.

At TalentConnect, we believe in not just teaching but unlocking your potential and building a bridge from learning to earning.

For any queries, feel free to reach us at support@talentconnect.com or call us at +1 (555) 123-4567.

We look forward to seeing you grow with us!

Best Regards,
Team TalentConnect
Your Talent, Unlocked. Your Future, Unstoppable.

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} TalentConnect. All rights reserved.`
    };

    console.log(`${logPrefix} Sending email to: ${msg.to}`);
    await sgMail.send(msg);
    console.log(`${logPrefix} Email sent successfully to: ${msg.to}`);
    
    return { success: true, message: 'Welcome email sent successfully' };
  } catch (error) {
    console.error(`${logPrefix} Error sending welcome email:`, {
      error: error.message,
      stack: error.stack,
      response: error.response?.body || 'No response body'
    });
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
};

export default {
  sendConsultationConfirmationEmail,
  sendAdminNotificationEmail,
  sendWelcomeEmail
};