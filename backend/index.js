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
    const { getAvailableCohorts } = require('./src/utils/cohorts');
    const availableCohorts = await getAvailableCohorts();
    const responseData = settings ? settings.toObject() : { feedbackEnabled: false };
    responseData.availableCohorts = availableCohorts;
    res.json(responseData);
  } catch (err) {
    console.error('Public settings route error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend assets
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback to index.html for SPA routing on client-side routes
app.get(['/login', '/profile', '/admin'], (req, res, next) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      next(); // Pass to 404 handler if index.html is missing
    }
  });
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
// Helper: Determine if tomorrow (Friday in Kolkata) is the day before a cohort weekend, and return its name
function getCohortNameForTomorrow() {
  const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(tomorrow);
  const y = parseInt(parts.find(p => p.type === 'year').value);
  const m = parseInt(parts.find(p => p.type === 'month').value); // 1-indexed, June is 6
  const d = parseInt(parts.find(p => p.type === 'day').value);

  if (y === 2026 && m === 6) {
    if (d === 13) return 'June 13 & 14, 2026';
  }
  return null;
}

// Helper: Determine if today (Saturday in Kolkata) is a cohort day 1, and return its name
function getCohortNameForToday() {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(today);
  const y = parseInt(parts.find(p => p.type === 'year').value);
  const m = parseInt(parts.find(p => p.type === 'month').value); // June is 6
  const d = parseInt(parts.find(p => p.type === 'day').value);

  if (y === 2026 && m === 6) {
    if (d === 13) return 'June 13 & 14, 2026';
  }
  return null;
}

// --- Reminder Email Cron Jobs ---------------
// Runs daily at 10:00 AM IST
// Sends "starts TOMORROW" reminder to all paid participants registered for the upcoming Saturday cohort if activated by admin
function scheduleReminderEmails() {
  const Settings = require('./src/models/Settings');
  const { sendCohortDay1Reminders, sendCohortDay2Reminders } = require('./src/utils/email');

  cron.schedule('0 10 * * *', async () => {
    try {
      const cohort = getCohortNameForTomorrow();
      if (!cohort) {
        console.log(`[Cron Day1] Tomorrow is not a cohort Saturday. Skipping.`);
        return;
      }

      const settings = await Settings.getSingleton();
      if (!settings.activeReminderCohort || settings.activeReminderCohort !== cohort) {
        console.log(`[Cron Day1] Cohort ${cohort} is not active for reminders. Active: ${settings.activeReminderCohort}. Skipping.`);
        return;
      }

      await sendCohortDay1Reminders(cohort, EVENT_NAME);
    } catch (err) {
      console.error('[Cron Day1] Job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log('✓ Day 1 reminder cron scheduled (Daily at 10:00 AM IST)');

  // Runs daily at 6:30 PM IST
  // Sends "get ready for Day 2" email after Day 1 ends to paid participants of today's cohort if activated by admin
  cron.schedule('30 18 * * *', async () => {
    try {
      const cohort = getCohortNameForToday();
      if (!cohort) {
        console.log(`[Cron Day2] Today is not a cohort Saturday. Skipping.`);
        return;
      }

      const settings = await Settings.getSingleton();
      if (!settings.activeReminderCohort || settings.activeReminderCohort !== cohort) {
        console.log(`[Cron Day2] Cohort ${cohort} is not active for reminders. Active: ${settings.activeReminderCohort}. Skipping.`);
        return;
      }

      await sendCohortDay2Reminders(cohort, EVENT_NAME);

      // Clear the active cohort as both Day 1 and Day 2 are completed
      settings.activeReminderCohort = null;
      await settings.save();
      console.log(`[Cron Day2] Cleared activeReminderCohort from Settings after Day 2 reminders.`);
    } catch (err) {
      console.error('[Cron Day2] Job error:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });
  console.log('✓ Day 2 reminder cron scheduled (Daily at 6:30 PM IST)');
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