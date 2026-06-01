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

// Helper: Get formatted date and time in India Standard Time
function getFormattedDateTime() {
  const options = {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  try {
    return new Intl.DateTimeFormat('en-US', options).format(new Date());
  } catch (e) {
    return new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  }
}



// Helper: Generates a premium HTML template wrapper with responsive layout & Arial font
function getHtmlTemplate({ greeting, contentHtml, otpCode }) {
  const currentYear = new Date().getFullYear();

  let middleBlock = '';
  if (otpCode) {
    middleBlock = `
      <div style="margin: 30px 0; text-align: center;">
        <div style="background-color: #0D1117; border-radius: 8px; padding: 24px 0; font-family: Arial, Helvetica, sans-serif; font-size: 38px; font-weight: bold; color: #FFFFFF; letter-spacing: 12px; padding-left: 12px; line-height: 1; text-align: center;">
          ${otpCode}
        </div>
        <div style="margin-top: 20px; font-size: 16px; color: #0D1117; font-family: Arial, Helvetica, sans-serif; text-align: center; font-weight: bold; line-height: 1.6;">
          OTP is valid for 10 minutes.
        </div>
        <div style="margin-top: 15px; font-size: 15px; color: #64748B; font-family: Arial, Helvetica, sans-serif; text-align: left; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email.
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lead with AI</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F0F4F8;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #2563EB;
      text-decoration: underline;
    }
    a:hover {
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F0F4F8; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0F4F8; padding: 40px 20px;">
    <tr>
      <td align="center" valign="top">
        <table width="640" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border: 2px solid #0D1117; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; margin: 20px 0; border-collapse: separate;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0D1117; padding: 25px 30px; border-bottom: 1px solid #2563EB; vertical-align: middle;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="https://www.globalknowledgetech.com/img/logo/gk-logo.svg" alt="Lead with AI" height="50" style="display: block; height: 50px; width: auto; border: 0;" />
                  </td>
                  <td align="right" valign="middle" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #EFF6FF; line-height: 1.2; font-weight: bold;">
                    ${getFormattedDateTime()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 50px 45px; line-height: 1.8; color: #1E293B; font-size: 16px; font-family: Arial, Helvetica, sans-serif; background-color: #FFFFFF;">
              <h2 style="font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: bold; color: #0D1117; margin-top: 0; margin-bottom: 24px; text-align: left;">
                ${greeting}
              </h2>
              <div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #1E293B; line-height: 1.8; text-align: left;">
                ${contentHtml}
              </div>
              ${middleBlock}
              <p style="margin-top: 40px; margin-bottom: 24px; color: #64748B; font-size: 14px; border-top: 1px dashed #CBD5E1; padding-top: 24px; font-family: Arial, Helvetica, sans-serif; text-align: left;">
                Have questions? We're here to help &mdash; reach us at <a href="mailto:events@gktech.ai" style="color: #2563EB; font-weight: bold; text-decoration: underline; font-family: Arial, Helvetica, sans-serif;">events@gktech.ai</a>
              </p>
              <p style="margin-top: 30px; margin-bottom: 0; color: #1E293B; font-size: 15px; line-height: 1.6; font-family: Arial, Helvetica, sans-serif; text-align: left;">
                Warm regards,<br>
                <strong style="color: #0D1117;">Team Global Knowledge Technologies</strong>
              </p>
            </td>
          </tr>
          <!-- Footer bar -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 24px 45px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B; font-family: Arial, Helvetica, sans-serif;">
              &copy; ${currentYear} Global Knowledge Technologies &middot; Lead with AI
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Helper: Map selectedCohort label to .ics start and end timestamps in UTC
function getIcsDateRange(cohortStr) {
  // Defaults to June 6 & 7 cohort
  let start = '20260606T043000Z'; // 10:00 AM IST is 04:30 UTC
  let end = '20260607T123000Z';   // 6:00 PM IST is 12:30 UTC
  
  if (cohortStr) {
    const s = cohortStr.toLowerCase();
    if (s.includes('13')) {
      start = '20260613T043000Z';
      end = '20260614T123000Z';
    } else if (s.includes('20')) {
      start = '20260620T043000Z';
      end = '20260621T123000Z';
    } else if (s.includes('27')) {
      start = '20260627T043000Z';
      end = '20260628T123000Z';
    }
  }
  return { start, end };
}

/**
 * Send registration confirmation email (HTML format)
 */
async function sendRegistrationEmail(user) {
  const greeting = `Welcome, ${user.fullName.split(' ')[0]}!`;
  const contentHtml = `
    <p>You have successfully registered for the <strong>Lead with AI: Adopt, Implement and Transform</strong> workshop for the cohort <strong>${user.selectedCohort || 'Selected June 2026 Cohort'}</strong>.</p>
    <p>To secure your seat, please complete the payment of <strong>₹${user.userType === 'student' ? '499' : '999'}</strong>. You can access your registration portal to complete the payment.</p>
    <p><a href="https://www.globalknowledgetech.com/leadwithAI/register" style="color: #2563EB; text-decoration: underline; font-weight: bold;">https://www.globalknowledgetech.com/leadwithAI/register</a></p>
  `;

  const html = getHtmlTemplate({ greeting, contentHtml });

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Registration Confirmed — Lead with AI Workshop`,
    html,
  });
}

/**
 * Send email verification OTP (used during registration — before account creation)
 */
async function sendVerificationOtpEmail(email, otp) {
  const greeting = `Your OTP for Email Verification`;
  const contentHtml = `
    Use the following one-time password to verify your email address and complete your registration:
  `;

  const html = getHtmlTemplate({ greeting, contentHtml, otpCode: otp });

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
  const greeting = `Hello${name ? `, ${name.split(' ')[0]}` : ''},`;
  const contentHtml = `
    You requested a one-time passcode to log in to your Lead with AI account, dont share it:
  `;

  const html = getHtmlTemplate({ greeting, contentHtml, otpCode: otp });

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
  const greeting = `Dear ${user.fullName.split(' ')[0]},`;
  const contentHtml = `
    <p style="font-size: 18px; color: #10B981; font-weight: bold; margin-bottom: 20px;">Payment Confirmed!</p>
    <p>Your seat for <strong>${eventName}</strong> is officially confirmed. We look forward to seeing you!</p>
    
    <div style="background-color: #F0F4F8; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B; width: 140px;" valign="top"><strong>Event</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">${eventName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Cohort Weekend</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B; font-weight: bold;" valign="top">${user.selectedCohort || 'Selected June 2026 Cohort'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Amount Paid</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B; font-weight: bold;" valign="top">₹${user.userType === 'student' ? '499' : '999'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Payment ID</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">${paymentId}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Session Link</strong></td>
          <td style="padding: 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px;" valign="top"><a href="${joinLink}" style="color: #2563EB; font-weight: bold; text-decoration: underline; word-break: break-all; font-family: Arial, Helvetica, sans-serif;">${joinLink}</a></td>
        </tr>
      </table>
    </div>
  `;

  const html = getHtmlTemplate({ greeting, contentHtml });

  const { start, end } = getIcsDateRange(user.selectedCohort);
  const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Global Knowledge Technologies//Lead with AI//EN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${paymentId}@leadwithai.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${start}
DTEND:${end}
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
  const greeting = `Hello,`;
  const html = getHtmlTemplate({ greeting, contentHtml: htmlContent });

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
  const greeting = `Dear ${user.fullName.split(' ')[0]},`;
  const contentHtml = `
    <p style="font-size: 18px; font-weight: bold; color: #0D1117; margin-bottom: 20px;">Reminder: Lead with AI Workshop starts TOMORROW!</p>
    <p>We're excited to have you join us for two days of learning, innovation, and hands-on exploration in the world of AI. Get ready to gain practical insights, interact with experts, and connect with fellow participants.</p>
    <p>Please ensure you join the session on time.</p>

    <div style="background-color: #F0F4F8; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B; width: 140px;" valign="top"><strong>Event</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">${eventName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Date</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">${user.selectedCohort || 'Selected June 2026 Cohort'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Time</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">10:00 AM – 6:00 PM IST</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Platform</strong></td>
          <td style="padding: 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">Online (Zoom)</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin: 35px 0;">
      <a href="${meetingLink}" style="display: inline-block; background-color: #0D1117; color: #FFFFFF !important; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-family: Arial, Helvetica, sans-serif; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Join the Zoom Meeting &rarr;</a>
    </p>
  `;

  const html = getHtmlTemplate({ greeting, contentHtml });

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
  const greeting = `Dear ${user.fullName.split(' ')[0]},`;
  const contentHtml = `
    <p style="font-size: 18px; font-weight: bold; color: #0D1117; margin-bottom: 20px;">Get Ready for Day 2!</p>
    <p>We hope you had a great experience during <strong>Day 1</strong> of the Lead with AI Workshop. Get ready for <strong>Day 2</strong>, where we'll continue exploring more exciting concepts, hands-on learning, and engaging discussions.</p>

    <div style="background-color: #F0F4F8; border: 1px solid #E2E8F0; border-radius: 8px; padding: 24px; margin: 30px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B; width: 140px;" valign="top"><strong>Event</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">${eventName} — Day 2</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Date</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">Day 2 of your selected Cohort (${user.selectedCohort || 'June 2026'})</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Time</strong></td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">10:00 AM – 6:00 PM IST</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #64748B;" valign="top"><strong>Platform</strong></td>
          <td style="padding: 10px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #1E293B;" valign="top">Online (Zoom)</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin: 35px 0;">
      <a href="${meetingLink}" style="display: inline-block; background-color: #0D1117; color: #FFFFFF !important; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-family: Arial, Helvetica, sans-serif; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Join Day 2 Zoom Session &rarr;</a>
    </p>
  `;

  const html = getHtmlTemplate({ greeting, contentHtml });

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Get Ready for Day 2 — Lead with AI Workshop Tomorrow!`,
    html,
  });
}

/**
 * Send profile approval notification (HTML format)
 * Sent when an admin approves a student's manual-review registration.
 */
async function sendProfileApprovedEmail(user) {
  const loginUrl = process.env.SITE_URL || 'https://project.globalknowledgetech.com/leadwithAI';
  const greeting = `Dear ${user.fullName},`;
  const contentHtml = `
    <p>Our team has reviewed your registration details for the <strong>Lead with AI: Adopt, Implement and Transform</strong> workshop and your profile has been approved.</p>
    <p>You can now log in to your account and complete the payment of <strong>₹${user.userType === 'student' ? '499' : '999'}</strong> to confirm your seat.</p>

    <p style="text-align: center; margin: 35px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #0D1117; color: #FFFFFF; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-family: Arial, Helvetica, sans-serif; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Log In &amp; Complete Payment &rarr;</a>
    </p>
  `;

  const html = getHtmlTemplate({ greeting, contentHtml });

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to: user.email,
    subject: `Your Profile Has Been Approved — Lead with AI Workshop`,
    html,
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
