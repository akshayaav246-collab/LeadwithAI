const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authRoutes = require('./src/routes/auth');
const paymentRoutes = require('./src/routes/payment');
const adminRoutes = require('./src/routes/admin');
const User = require('./src/models/User');
const { sendReminderEmail, sendDay2ReminderEmail } = require('./src/utils/email');
const app = express();
const PORT = process.env.PORT || 4002;
// Event details
const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
const MEETING_LINK = process.env.ZOOM_LINK || 'https://zoom.us/j/00000000000';
const EVENT_DATE_DAY1 = new Date('2026-05-30T04:30:00Z'); // May 30 10:00 AM IST
const EVENT_DATE_DAY2 = new Date('2026-05-30T12:30:00Z'); // May 30 6:00 PM IST (end of Day 1)
// --- Middleware ------------------------------
// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
// Serve uploaded files (student ID cards)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- Rate Limiters --------------------------
// Limits OTP send requests: max 5 per email per 15 minutes
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body && req.body.email ? req.body.email.toLowerCase().trim() : ipKeyGenerator(req);
  },
  message: { error: 'Too many OTP requests for this email. Please try again after 15 minutes.' },
});
// Limits OTP verification attempts: max 10 per email per 15 minutes
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body && req.body.email ? req.body.email.toLowerCase().trim() : ipKeyGenerator(req);
  },
  message: { error: 'Too many verification attempts for this email. Please try again after 15 minutes.' },
});
// Limits registrations: max 5 per email per hour
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body && req.body.email ? req.body.email.toLowerCase().trim() : ipKeyGenerator(req);
  },
  message: { error: 'Too many registration attempts for this email. Please try again after an hour.' },
});
// --- Routes ---------------------------------

// Maintenance Middleware (Intercepts all except /api/admin, /api/health, and /api/public/settings)
app.use(async (req, res, next) => {
  if (
    req.path.startsWith('/api/admin') || 
    req.path.startsWith('/api/health') || 
    req.path.startsWith('/api/public/settings') ||
    req.path.startsWith('/uploads')
  ) {
    return next();
  }
  
  try {
    const Settings = require('./src/models/Settings');
    const settings = await Settings.findOne();
    if (settings && settings.isMaintenanceMode) {
      return res.status(503).json({ error: 'Service is currently under maintenance. Please try again later.', isMaintenanceMode: true });
    }
  } catch (err) {
    console.error('Maintenance check error:', err);
  }
  next();
});

app.use('/api/auth/send-otp', otpSendLimiter);
app.use('/api/auth/send-register-otp', otpSendLimiter);
app.use('/api/auth/verify-otp', otpVerifyLimiter);
app.use('/api/auth/verify-register-otp', otpVerifyLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Public settings route
app.get('/api/public/settings', async (req, res) => {
  try {
    const Settings = require('./src/models/Settings');
    const settings = await Settings.findOne();
    res.json(settings || { feedbackEnabled: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});
// --- Reminder Email Cron Jobs ---------------
// DAY 1 REMINDER: Runs at 9:00 AM IST (03:30 UTC) on May 29th
// Sends "starts TOMORROW" reminder to all paid participants
function scheduleReminderEmails() {
  cron.schedule('30 3 * * *', async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const isTomorrow =
        tomorrow.getUTCFullYear() === EVENT_DATE_DAY1.getUTCFullYear() &&
        tomorrow.getUTCMonth() === EVENT_DATE_DAY1.getUTCMonth() &&
        tomorrow.getUTCDate() === EVENT_DATE_DAY1.getUTCDate();
      if (!isTomorrow) {
        console.log(`[Cron Day1] Not 1 day before event. Skipping.`);
        return;
      }
      console.log('[Cron Day1] Sending Day 1 reminder emails...');
      const paidUsers = await User.find({
        registeredEvents: { $elemMatch: { eventName: EVENT_NAME, paymentStatus: 'confirmed' } }
      });
      let sent = 0;
      for (const user of paidUsers) {
        try {
          await sendReminderEmail(user, EVENT_NAME, MEETING_LINK);
          sent++;
        } catch (err) {
          console.error(`[Cron Day1] Failed for ${user.email}:`, err.message);
        }
      }
      console.log(`[Cron Day1] Sent: ${sent}/${paidUsers.length}`);
    } catch (err) {
      console.error('[Cron Day1] Job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log('✓ Day 1 reminder cron scheduled (9:00 AM IST on May 29th)');

  // DAY 2 REMINDER: Runs at 6:30 PM IST (13:00 UTC) on May 30th
  // Sends "get ready for Day 2" email after Day 1 ends
  cron.schedule('0 13 * * *', async () => {
    try {
      const now = new Date();
      const isDay1 =
        now.getUTCFullYear() === EVENT_DATE_DAY1.getUTCFullYear() &&
        now.getUTCMonth() === EVENT_DATE_DAY1.getUTCMonth() &&
        now.getUTCDate() === EVENT_DATE_DAY1.getUTCDate();
      if (!isDay1) {
        console.log(`[Cron Day2] Not May 30th. Skipping.`);
        return;
      }
      console.log('[Cron Day2] Sending Day 2 reminder emails...');
      const paidUsers = await User.find({
        registeredEvents: { $elemMatch: { eventName: EVENT_NAME, paymentStatus: 'confirmed' } }
      });
      let sent = 0;
      for (const user of paidUsers) {
        try {
          await sendDay2ReminderEmail(user, EVENT_NAME, MEETING_LINK);
          sent++;
        } catch (err) {
          console.error(`[Cron Day2] Failed for ${user.email}:`, err.message);
        }
      }
      console.log(`[Cron Day2] Sent: ${sent}/${paidUsers.length}`);
    } catch (err) {
      console.error('[Cron Day2] Job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log('✓ Day 2 reminder cron scheduled (6:30 PM IST on May 30th)');
}
// --- MongoDB + Start Server ------------------
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Mongoose will attempt to auto-reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB successfully reconnected!');
});

const connectDB = async (retries = 5, delayMs = 5000) => {
  while (retries > 0) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME });
      console.log('Connected to MongoDB');
      
      // Drop obsolete collegedomains collection if it exists
      try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections({ name: 'collegedomains' }).toArray();
        if (collections.length > 0) {
          await db.dropCollection('collegedomains');
          console.log('✓ Dropped obsolete collegedomains collection');
        }
      } catch (dropErr) {
        console.warn('Failed to drop obsolete collegedomains collection:', dropErr.message);
      }

      app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
      });
      scheduleReminderEmails();
      return; // Exit loop on success
    } catch (err) {
      console.error(`MongoDB connection failed. Retries left: ${retries - 1}`, err.message);
      retries -= 1;
      if (retries === 0) {
        console.error('All retries exhausted. Exiting process.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};

connectDB();