const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send registration confirmation email
 */
async function sendRegistrationEmail(user) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; color: #2A1F14; background: #FAF7F2; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2D9CC; border-radius: 8px; overflow: hidden; }
        .header { background: #3B2F2F; padding: 2.5rem 2rem; text-align: center; }
        .header h1 { color: #C4956A; font-size: 1.8rem; margin: 0; }
        .header p { color: rgba(255,255,255,0.7); margin: 0.5rem 0 0; font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .body { padding: 2.5rem 2rem; }
        .body h2 { color: #3B2F2F; margin-top: 0; }
        .detail-row { display: flex; padding: 0.6rem 0; border-bottom: 1px solid #F0EBE1; font-size: 0.95rem; }
        .detail-label { color: #8C7B6B; width: 140px; flex-shrink: 0; }
        .detail-value { color: #2A1F14; font-weight: 500; }
        .highlight-box { background: #FFF4E6; border: 2px solid #C4956A; border-left: 8px solid #C4956A; padding: 1.5rem; border-radius: 6px; margin: 2rem 0; font-size: 1.05rem; box-shadow: 0 4px 12px rgba(196, 149, 106, 0.15); }
        .footer { background: #F5F0E8; padding: 1.5rem 2rem; text-align: center; font-size: 0.85rem; color: #8C7B6B; }
        .btn { display: inline-block; background: #C4956A; color: #fff !important; padding: 0.8rem 2rem; border-radius: 4px; text-decoration: none; font-family: Georgia, serif; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Lead with AI</h1>
          <p>by Global Knowledge Technologies</p>
        </div>
        <div class="body">
          <h2>Welcome, ${user.fullName.split(' ')[0]}!</h2>
          <p>You've successfully registered for the <strong>Lead with AI: Adopt, Implement and Transform</strong> workshop. Here's a summary of your details:</p>
          
          <div style="margin: 1.5rem 0;">
            <div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${user.fullName}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email}</span></div>
            <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${user.phone}</span></div>
            <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${user.userType === 'student' ? 'Student' : 'Working Professional'}</span></div>
            ${user.userType === 'student' ? `
            <div class="detail-row"><span class="detail-label">College</span><span class="detail-value">${user.collegeName || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">Course</span><span class="detail-value">${user.course || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">Year</span><span class="detail-value">${user.year || '-'}</span></div>
            ` : `
            <div class="detail-row"><span class="detail-label">Domain</span><span class="detail-value">${user.domain || '-'}</span></div>
            `}
          </div>

          <div class="highlight-box">
            <strong>Next Step: Payment</strong><br>
            Your registration is complete. Please complete the payment of <strong>₹500</strong> to confirm your seat. Check your registration portal for the payment link.
          </div>

          <p style="color: #6B4F3A; font-size: 0.95rem;">If you have any questions, reply to this email or reach us at <a href="mailto:genquiry@globalknowledgetech.com" style="color: #C4956A;">genquiry@globalknowledgetech.com</a></p>
        </div>
        <div class="footer">
          © 2026 Global Knowledge Technologies · Lead with AI<br>
          This email was sent because you registered on our platform.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Registration Confirmed — Lead with AI Workshop`,
    html,
  });
}

/**
 * Send OTP login email
 */
async function sendOtpEmail(email, otp, name) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; color: #2A1F14; background: #FAF7F2; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2D9CC; border-radius: 8px; overflow: hidden; }
        .header { background: #3B2F2F; padding: 2.5rem 2rem; text-align: center; }
        .header h1 { color: #C4956A; font-size: 1.8rem; margin: 0; }
        .otp-box { background: #3B2F2F; color: #C4956A; font-size: 2.5rem; font-weight: bold; text-align: center; padding: 1.5rem; letter-spacing: 0.4em; border-radius: 6px; margin: 1.5rem 0; font-family: 'Courier New', monospace; }
        .body { padding: 2.5rem 2rem; }
        .footer { background: #F5F0E8; padding: 1.5rem 2rem; text-align: center; font-size: 0.85rem; color: #8C7B6B; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Lead with AI</h1>
        </div>
        <div class="body">
          <h2 style="color: #3B2F2F; margin-top: 0;">Your Login OTP${name ? `, ${name.split(' ')[0]}` : ''}</h2>
          <p>Use the following one-time password to log in to your Lead with AI account:</p>
          <div class="otp-box">${otp}</div>
          <p style="color: #8C7B6B; font-size: 0.9rem;"><svg style="vertical-align: middle; margin-right: 4px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #8C7B6B; font-size: 0.9rem;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          © 2026 Global Knowledge Technologies · Lead with AI
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: `Your Lead with AI Login OTP`,
    html,
  });
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(user, eventName, paymentId) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; color: #2A1F14; background: #FAF7F2; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2D9CC; border-radius: 8px; overflow: hidden; }
        .header { background: #3B2F2F; padding: 2.5rem 2rem; text-align: center; }
        .header h1 { color: #C4956A; font-size: 1.8rem; margin: 0; }
        .success-icon { font-size: 3rem; text-align: center; margin: 1rem 0; }
        .body { padding: 2.5rem 2rem; }
        .ticket-box { background: #F5F0E8; border: 1px solid #E2D9CC; border-radius: 6px; padding: 1.5rem; margin: 1.5rem 0; }
        .ticket-row { display: flex; padding: 0.5rem 0; font-size: 0.95rem; border-bottom: 1px solid #E2D9CC; }
        .ticket-label { color: #8C7B6B; width: 150px; flex-shrink: 0; }
        .ticket-value { color: #2A1F14; font-weight: 500; }
        .footer { background: #F5F0E8; padding: 1.5rem 2rem; text-align: center; font-size: 0.85rem; color: #8C7B6B; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Lead with AI</h1>
        </div>
        <div class="body">
          <div class="success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5CBA9E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <h2 style="color: #3B2F2F; margin-top: 0; text-align: center;">Payment Confirmed!</h2>
          <p>Your seat for <strong>${eventName}</strong> is officially confirmed. We look forward to seeing you!</p>
          <div class="ticket-box">
            <div class="ticket-row"><span class="ticket-label">Name</span><span class="ticket-value">${user.fullName}</span></div>
            <div class="ticket-row"><span class="ticket-label">Email</span><span class="ticket-value">${user.email}</span></div>
            <div class="ticket-row"><span class="ticket-label">Event</span><span class="ticket-value">${eventName}</span></div>
            <div class="ticket-row"><span class="ticket-label">Amount Paid</span><span class="ticket-value">₹500</span></div>
            <div class="ticket-row" style="border-bottom: none;"><span class="ticket-label">Payment ID</span><span class="ticket-value" style="font-family: monospace; font-size: 0.85rem;">${paymentId}</span></div>
          </div>

          <p style="color: #6B4F3A; font-size: 0.95rem;">Save this email as your receipt. For any queries, reach us at <a href="mailto:genquiry@globalknowledgetech.com" style="color: #C4956A;">genquiry@globalknowledgetech.com</a></p>
        </div>
        <div class="footer">
          © 2026 Global Knowledge Technologies · Lead with AI
        </div>
      </div>
    </body>
    </html>
  `;

  const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Global Knowledge Technologies//Lead with AI//EN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${paymentId}@leadwithai.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:20260516T043000Z
DTEND:20260517T123000Z
SUMMARY:Lead with AI: Adopt, Implement and Transform
LOCATION:Online
DESCRIPTION:Two-day professional AI program by Global Knowledge Technologies.
ORGANIZER;CN=Global Knowledge Technologies:mailto:${process.env.FROM_EMAIL}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Payment Confirmed — Your seat is booked!`,
    html,
    icalEvent: {
      filename: 'invitation.ics',
      method: 'publish',
      content: icalContent
    }
  });
}
/**
 * Send custom bulk email from admin
 */
async function sendCustomBulkEmail(emails, subject, htmlContent) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; color: #2A1F14; background: #FAF7F2; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2D9CC; border-radius: 8px; overflow: hidden; }
        .header { background: #3B2F2F; padding: 2.5rem 2rem; text-align: center; }
        .header h1 { color: #C4956A; font-size: 1.8rem; margin: 0; }
        .body { padding: 2.5rem 2rem; font-size: 1rem; line-height: 1.6; }
        .footer { background: #F5F0E8; padding: 1.5rem 2rem; text-align: center; font-size: 0.85rem; color: #8C7B6B; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Lead with AI</h1>
        </div>
        <div class="body">
          ${htmlContent}
        </div>
        <div class="footer">
          © 2026 Global Knowledge Technologies · Lead with AI
        </div>
      </div>
    </body>
    </html>
  `;

  // Send as BCC to protect user privacy
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    bcc: emails,
    subject: subject,
    html,
  });
}

/**
 * Send 1-day reminder email to paid participants
 */
async function sendReminderEmail(user, eventName, meetingLink) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Georgia, serif; color: #2A1F14; background: #FAF7F2; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #E2D9CC; border-radius: 8px; overflow: hidden; }
        .header { background: #3B2F2F; padding: 2.5rem 2rem; text-align: center; }
        .header h1 { color: #C4956A; font-size: 1.8rem; margin: 0; }
        .header p { color: rgba(255,255,255,0.7); margin: 0.5rem 0 0; font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; }
        .body { padding: 2.5rem 2rem; }
        .body h2 { color: #3B2F2F; margin-top: 0; }
        .highlight-box { background: #F5F0E8; border-left: 4px solid #C4956A; padding: 1rem 1.5rem; border-radius: 4px; margin: 1.5rem 0; }
        .detail-row { display: flex; padding: 0.6rem 0; border-bottom: 1px solid #F0EBE1; font-size: 0.95rem; }
        .detail-label { color: #8C7B6B; width: 140px; flex-shrink: 0; }
        .detail-value { color: #2A1F14; font-weight: 500; }
        .btn { display: inline-block; background: #C4956A; color: #fff !important; padding: 0.9rem 2.2rem; border-radius: 4px; text-decoration: none; font-family: Georgia, serif; font-weight: 600; margin-top: 1rem; }
        .footer { background: #F5F0E8; padding: 1.5rem 2rem; text-align: center; font-size: 0.85rem; color: #8C7B6B; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Lead with AI</h1>
          <p>by Global Knowledge Technologies</p>
        </div>
        <div class="body">
          <h2>See you tomorrow, ${user.fullName.split(' ')[0]}! 🎉</h2>
          <p>This is a friendly reminder that <strong>${eventName}</strong> starts <strong>tomorrow</strong>. We're excited to have you with us!</p>

          <div class="highlight-box">
            <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventName}</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">16th May 2026 — 17th May 2026</span></div>
            <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">10:00 AM – 6:00 PM IST</span></div>
            <div class="detail-row" style="border-bottom:none;"><span class="detail-label">Platform</span><span class="detail-value">Online (Zoom)</span></div>
          </div>

          <p style="text-align:center;">
            <a href="${meetingLink}" class="btn">Join the Zoom Meeting →</a>
          </p>

          <p style="color: #6B4F3A; font-size: 0.95rem; margin-top: 1.5rem;">
            Please join 5 minutes early to ensure a smooth start. For any queries, reach us at 
            <a href="mailto:genquiry@globalknowledgetech.com" style="color: #C4956A;">genquiry@globalknowledgetech.com</a>
          </p>
        </div>
        <div class="footer">
          © 2025 Global Knowledge Technologies · Lead with AI<br>
          You're receiving this because you registered for the Lead with AI workshop.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Reminder: Lead with AI Workshop starts TOMORROW! 🚀`,
    html,
  });
}

module.exports = { sendRegistrationEmail, sendOtpEmail, sendPaymentConfirmationEmail, sendCustomBulkEmail, sendReminderEmail };
