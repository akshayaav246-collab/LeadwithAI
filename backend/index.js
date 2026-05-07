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
const { sendReminderEmail } = require('./src/utils/email');
const app = express();
const PORT = process.env.PORT || 4002;
// Event details
const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
const MEETING_LINK = 'https://zoom.us/j/00000000000'; // Replace with actual Zoom link
const EVENT_DATE = new Date('2026-05-16T04:30:00Z'); // May 16 10:00 AM IST = 04:30 UTC
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
// --- Reminder Email Cron Job -----------------
// Runs at 9:00 AM IST (03:30 UTC) every day
// Sends reminder if tomorrow is the event date (May 16 2026)
function scheduleReminderEmails() {
  cron.schedule('30 3 * * *', async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const isTomorrow =
        tomorrow.getUTCFullYear() === EVENT_DATE.getUTCFullYear() &&
        tomorrow.getUTCMonth() === EVENT_DATE.getUTCMonth() &&
        tomorrow.getUTCDate() === EVENT_DATE.getUTCDate();
      if (!isTomorrow) {
        console.log(`[Cron] Today is not 1 day before the event. Skipping reminders.`);
        return;
      }
      console.log('[Cron] Event is tomorrow! Sending reminder emails to paid participants...');
      const paidUsers = await User.find({
        'registeredEvents': {
          $elemMatch: { eventName: EVENT_NAME, paymentStatus: 'confirmed' }
        }
      });
      let sent = 0;
      for (const user of paidUsers) {
        try {
          await sendReminderEmail(user, EVENT_NAME, MEETING_LINK);
          sent++;
        } catch (err) {
          console.error(`[Cron] Failed to send reminder to ${user.email}:`, err.message);
        }
      }
      console.log(`[Cron] Reminder emails sent: ${sent}/${paidUsers.length}`);
    } catch (err) {
      console.error('[Cron] Reminder job error:', err.message);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });
  console.log('? Reminder email cron job scheduled (runs daily at 9:00 AM IST)');
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