const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendCustomBulkEmail } = require('../utils/email');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { adminId: 'master-admin', isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    return res.json({ token, message: 'Admin logged in successfully' });
  }

  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// ─────────────────────────────────────────────
// GET /api/admin/stats
// ─────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const users = await User.find().select('registeredEvents createdAt');
    
    let paidUsers = 0;
    users.forEach(u => {
      if (u.registeredEvents && u.registeredEvents.some(e => e.paymentStatus === 'confirmed')) {
        paidUsers++;
      }
    });

    const recentRegistrations = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email userType createdAt');

    res.json({
      totalUsers,
      paidUsers,
      recentRegistrations
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-otpHash -otpExpiry');
    
    // Map to a cleaner format for the frontend table
    const formattedUsers = users.map(u => {
      const isPaid = u.registeredEvents && u.registeredEvents.some(e => e.paymentStatus === 'confirmed');
      return {
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        userType: u.userType,
        collegeName: u.collegeName || u.domain || '-',
        isPaid,
        createdAt: u.createdAt
      };
    });

    res.json(formattedUsers);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/send-email
// ─────────────────────────────────────────────
router.post('/send-email', adminAuth, async (req, res) => {
  try {
    const { subject, htmlContent, recipientType, customEmails } = req.body;

    if (!subject || !htmlContent) {
      return res.status(400).json({ error: 'Subject and HTML content are required' });
    }

    let targetEmails = [];

    if (recipientType === 'all') {
      const users = await User.find().select('email');
      targetEmails = users.map(u => u.email);
    } else if (recipientType === 'paid') {
      const users = await User.find().select('email registeredEvents');
      targetEmails = users
        .filter(u => u.registeredEvents && u.registeredEvents.some(e => e.paymentStatus === 'confirmed'))
        .map(u => u.email);
    } else if (recipientType === 'custom') {
      if (!customEmails || !Array.isArray(customEmails) || customEmails.length === 0) {
        return res.status(400).json({ error: 'Custom emails array is required' });
      }
      targetEmails = customEmails;
    } else {
      return res.status(400).json({ error: 'Invalid recipient type' });
    }

    if (targetEmails.length === 0) {
      return res.status(400).json({ error: 'No recipients found for the selected criteria' });
    }

    // Send emails
    await sendCustomBulkEmail(targetEmails, subject, htmlContent);

    res.json({ message: `Successfully sent email to ${targetEmails.length} recipients.` });
  } catch (err) {
    console.error('Admin send email error:', err);
    res.status(500).json({ error: 'Failed to send bulk email' });
  }
});

module.exports = router;
