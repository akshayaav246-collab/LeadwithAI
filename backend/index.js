const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
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
const EVENT_DATE_DAY1 = new Date('2026-05-16T04:30:00Z'); // May 16 10:00 AM IST
const EVENT_DATE_DAY2 = new Date('2026-05-16T12:30:00Z'); // May 16 6:00 PM IST (end of Day 1)
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve uploaded files (student ID cards)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- Routes ---------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
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
// DAY 1 REMINDER: Runs at 9:00 AM IST (03:30 UTC) on May 15th
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
  console.log('✓ Day 1 reminder cron scheduled (9:00 AM IST on May 15th)');

  // DAY 2 REMINDER: Runs at 6:30 PM IST (13:00 UTC) on May 16th
  // Sends "get ready for Day 2" email after Day 1 ends
  cron.schedule('0 13 * * *', async () => {
    try {
      const now = new Date();
      const isDay1 =
        now.getUTCFullYear() === EVENT_DATE_DAY1.getUTCFullYear() &&
        now.getUTCMonth() === EVENT_DATE_DAY1.getUTCMonth() &&
        now.getUTCDate() === EVENT_DATE_DAY1.getUTCDate();
      if (!isDay1) {
        console.log(`[Cron Day2] Not May 16th. Skipping.`);
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
  console.log('✓ Day 2 reminder cron scheduled (6:30 PM IST on May 16th)');
}
// --- MongoDB + Start Server ------------------
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB_NAME })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
    scheduleReminderEmails();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });