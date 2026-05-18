const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendCustomBulkEmail, sendProfileApprovedEmail } = require('../utils/email');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await admin.verifyPassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { adminId: admin._id.toString(), isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      admin: { id: admin._id, fullName: admin.fullName, email: admin.email },
      message: 'Logged in successfully',
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin
// Create an admin.
// No auth needed for the very first admin (bootstrap).
// Auth required once at least one admin exists.
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password)
      return res.status(400).json({ error: 'fullName, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const adminCount = await Admin.countDocuments();

    if (adminCount > 0) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({ error: 'Auth required: admins already exist' });
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (!decoded.isAdmin)
          return res.status(403).json({ error: 'Forbidden: Admin access required' });
      } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(409).json({ error: 'An admin with this email already exists' });

    const admin = new Admin({ fullName, email, password });
    await admin.save();

    res.status(201).json({
      message: adminCount === 0 ? 'First admin created successfully' : 'Admin created successfully',
      admin: { id: admin._id, fullName: admin.fullName, email: admin.email, createdAt: admin.createdAt },
    });
  } catch (err) {
    console.error('POST /api/admin error:', err);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin
// Get all admins
// ─────────────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 }).select('-password');
    res.json(admins);
  } catch (err) {
    console.error('GET /api/admin error:', err);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/stats
// Dashboard overview stats
// ─────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const users = await User.find().select('registeredEvents createdAt');

    let paidUsers = 0;
    users.forEach(u => {
      if (u.registeredEvents && u.registeredEvents.some(e => e.paymentStatus === 'confirmed'))
        paidUsers++;
    });

    const recentRegistrations = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email userType createdAt');

    res.json({ totalUsers, paidUsers, recentRegistrations });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users
// All registered users (used by dashboard table)
// ─────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-otpHash -otpExpiry');

    const formatted = users.map(u => {
      const confirmed = u.registeredEvents && u.registeredEvents.find(e => e.paymentStatus === 'confirmed');
      return {
        id:           u._id,
        fullName:     u.fullName,
        email:        u.email,
        phone:        u.phone,
        userType:     u.userType,
        heardFrom:    u.heardFrom || '-',
        isWaitlisted: u.isWaitlisted || false,
        referralCode: u.referralCode || '-',
        // Student fields
        collegeName:  u.collegeName  || '-',
        course:       u.course       || '-',
        year:         u.year         || '-',
        idCardPath:   u.idCardPath   || null,
        // Working professional fields
        domain:       u.domain       || '-',
        organization: u.organization || '-',
        // Payment
        isPaid:    !!confirmed,
        paymentId: confirmed ? (confirmed.razorpayPaymentId || '-') : '-',
        createdAt: u.createdAt,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users/:id
// Single registered user
// ─────────────────────────────────────────────
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-otpHash -otpExpiry');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const confirmed = user.registeredEvents && user.registeredEvents.find(e => e.paymentStatus === 'confirmed');

    res.json({
      id:           user._id,
      fullName:     user.fullName,
      email:        user.email,
      phone:        user.phone,
      userType:     user.userType,
      heardFrom:    user.heardFrom || '-',
      isWaitlisted: user.isWaitlisted || false,
      // Student fields
      collegeName:  user.collegeName  || '-',
      course:       user.course       || '-',
      year:         user.year         || '-',
      idCardPath:   user.idCardPath   || null,
      // Working professional fields
      domain:       user.domain       || '-',
      organization: user.organization || '-',
      // Payment
      isPaid:           !!confirmed,
      paymentId:        confirmed ? (confirmed.razorpayPaymentId || '-') : '-',
      registeredEvents: user.registeredEvents,
      createdAt:        user.createdAt,
    });
  } catch (err) {
    console.error('GET /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/admin/users/:id
// Delete a registered user
// ─────────────────────────────────────────────
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: `User "${user.fullName}" deleted successfully`, id: req.params.id });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/send-email
// Send bulk email to users
// ─────────────────────────────────────────────
router.post('/send-email', adminAuth, async (req, res) => {
  try {
    const { subject, htmlContent, recipientType, customEmails } = req.body;

    if (!subject || !htmlContent)
      return res.status(400).json({ error: 'Subject and HTML content are required' });

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
      if (!customEmails || !Array.isArray(customEmails) || customEmails.length === 0)
        return res.status(400).json({ error: 'Custom emails array is required' });
      targetEmails = customEmails;
    } else {
      return res.status(400).json({ error: 'Invalid recipient type' });
    }

    if (targetEmails.length === 0)
      return res.status(400).json({ error: 'No recipients found' });

    await sendCustomBulkEmail(targetEmails, subject, htmlContent);
    res.json({ message: `Successfully sent email to ${targetEmails.length} recipients.` });
  } catch (err) {
    console.error('Admin send email error:', err);
    res.status(500).json({ error: 'Failed to send bulk email' });
  }
});



// ─────────────────────────────────────────────
// GET /api/admin/settings
// Get system settings
// ─────────────────────────────────────────────
router.get('/settings', adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ feedbackEnabled: false });
    }
    res.json(settings);
  } catch (err) {
    console.error('Admin get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/settings/feedback
// Toggle feedback enabled status
// ─────────────────────────────────────────────
router.patch('/settings/feedback', adminAuth, async (req, res) => {
  try {
    const { feedbackEnabled } = req.body;
    if (typeof feedbackEnabled !== 'boolean') {
      return res.status(400).json({ error: 'feedbackEnabled boolean is required' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ feedbackEnabled });
    } else {
      settings.feedbackEnabled = feedbackEnabled;
      await settings.save();
    }

    res.json(settings);
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
