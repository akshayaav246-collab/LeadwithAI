const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,       // STARTTLS — do NOT use port 465
  requireTLS: true,    // Force STARTTLS (required by Outlook)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',  // Outlook compatibility fix
  },
});

// ─────────────────────────────────────────────────────
// Shared footer snippet used across all HTML emails
// ─────────────────────────────────────────────────────
const SHARED_FOOTER = `
  <p style="color: #6B4F3A; font-size: 0.95rem; margin-top: 1.5rem;">
    Warm regards,<br>
    <strong>Team Global Knowledge Technologies</strong>
  </p>`;

const FOOTER_BAR = `
  <div class="footer">
    © 2026 Global Knowledge Technologies · Lead with AI
  </div>`;

/**
 * Send registration confirmation email (plain text)
 */
async function sendRegistrationEmail(user) {
  const text =
    `Welcome, ${user.fullName.split(' ')[0]}!\n` +
    `You've successfully registered for the Lead with AI: Adopt, Implement and Transform workshop. ` +
    `Please complete the payment of ₹${user.userType === 'student' ? '499' : '999'} to confirm your seat. Check your registration portal for the payment link.\n\n` +
    `Warm regards,\nTeam Global Knowledge Technologies`;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Registration Confirmed — Lead with AI Workshop`,
    text,
  });
}

/**
 * Send email verification OTP (used during registration — before account creation)
 */
async function sendVerificationOtpEmail(email, otp) {
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
          <h2 style="color: #3B2F2F; margin-top: 0;">Your OTP for Email Verification</h2>
          <p>Use the following one-time password to verify your email address and complete your registration:</p>
          <div class="otp-box">${otp}</div>
          <p style="color: #8C7B6B; font-size: 0.9rem;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #8C7B6B; font-size: 0.9rem;">If you did not initiate this, you can safely ignore this email.</p>
          ${SHARED_FOOTER}
        </div>
        ${FOOTER_BAR}
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: `Your OTP for Email Verification — Lead with AI`,
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
          ${SHARED_FOOTER}
        </div>
        ${FOOTER_BAR}
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
async function sendPaymentConfirmationEmail(user, eventName, paymentId, zoomJoinUrl) {
  const joinLink = zoomJoinUrl || process.env.ZOOM_LINK || 'https://zoom.us/j/00000000000';
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
            <div class="ticket-row"><span class="ticket-label">Event</span><span class="ticket-value">${eventName}</span></div>
            <div class="ticket-row"><span class="ticket-label">Amount Paid</span><span class="ticket-value">₹${user.userType === 'student' ? '499' : '999'}</span></div>
            <div class="ticket-row"><span class="ticket-label">Payment ID</span><span class="ticket-value" style="font-family: monospace; font-size: 0.85rem;">${paymentId}</span></div>
            <div class="ticket-row" style="border-bottom: none;"><span class="ticket-label">Session Link</span><span class="ticket-value"><a href="${joinLink}" style="color: #C4956A; word-break: break-all;">${joinLink}</a></span></div>
          </div>

          <p style="color: #6B4F3A; font-size: 0.95rem;">For any queries, reach us at <a href="mailto:events@gktech.ai" style="color: #C4956A;">events@gktech.ai</a></p>
          ${SHARED_FOOTER}
        </div>
        ${FOOTER_BAR}
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
          ${SHARED_FOOTER}
        </div>
        ${FOOTER_BAR}
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
 * Send Day 1 reminder email (sent on May 15th — day before event)
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
          <h2>Reminder: Lead with AI Workshop starts TOMORROW!</h2>
          <p>We're excited to have you join us for two days of learning, innovation, and hands-on exploration in the world of AI. Get ready to gain practical insights, interact with experts, and connect with fellow participants.</p>
          <p>Please ensure you join the session on time.</p>

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
            For any queries, reach us at <a href="mailto:events@gktech.ai" style="color: #C4956A;">events@gktech.ai</a>
          </p>
          ${SHARED_FOOTER}
        </div>
        ${FOOTER_BAR}
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

/**
 * Send Day 2 reminder email (sent on May 16th after 6 PM IST)
 */
async function sendDay2ReminderEmail(user, eventName, meetingLink) {
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
          <h2>Get Ready for Day 2! 🚀</h2>
          <p>We hope you had a great experience during <strong>Day 1</strong> of the Lead with AI Workshop. Get ready for <strong>Day 2</strong>, where we'll continue exploring more exciting concepts, hands-on learning, and engaging discussions.</p>

          <div class="highlight-box">
            <div class="detail-row"><span class="detail-label">Event</span><span class="detail-value">${eventName} — Day 2</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">17th May 2026</span></div>
            <div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">10:00 AM – 6:00 PM IST</span></div>
            <div class="detail-row" style="border-bottom:none;"><span class="detail-label">Platform</span><span class="detail-value">Online (Zoom)</span></div>
          </div>

          <p style="text-align:center;">
            <a href="${meetingLink}" class="btn">Join Day 2 Zoom Session →</a>
          </p>

          <p style="color: #6B4F3A; font-size: 0.95rem; margin-top: 1.5rem;">
            For any queries, reach us at <a href="mailto:events@gktech.ai" style="color: #C4956A;">events@gktech.ai</a>
          </p>
          ${SHARED_FOOTER}
        </div>
        ${FOOTER_BAR}
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Get Ready for Day 2 — Lead with AI Workshop Tomorrow! 🎯`,
    html,
  });
}

/**
 * Send profile approval notification (plain text)
 * Sent when an admin approves a student's manual-review registration.
 */
async function sendProfileApprovedEmail(user) {
  const text =
    `Dear ${user.fullName},\n\n` +
    `Our team has reviewed your registration details for the Lead with AI: Adopt, Implement and Transform workshop and your profile has been approved.\n\n` +
    `You can now log in to your account and complete the payment of ₹${user.userType === 'student' ? '499' : '999'} to confirm your seat.\n\n` +
    `Login here: ${process.env.SITE_URL || 'https://project.globalknowledgetech.com/leadwithAI'}\n\n` +
    `If you have any questions, feel free to reach us at ${process.env.FROM_EMAIL || 'events@gktech.ai'}.\n\n` +
    `Warm regards,\nTeam Global Knowledge Technologies`;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Your Profile Has Been Approved — Lead with AI Workshop`,
    text,
  });
}

module.exports = {
  sendRegistrationEmail,
  sendVerificationOtpEmail,
  sendOtpEmail,
  sendPaymentConfirmationEmail,
  sendCustomBulkEmail,
  sendReminderEmail,
  sendDay2ReminderEmail,
  sendProfileApprovedEmail,
};
