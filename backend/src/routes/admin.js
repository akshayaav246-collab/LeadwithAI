const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendCustomBulkEmail, sendProfileApprovedEmail } = require('../utils/email');
const adminAuth = require('../middleware/adminAuth');
const auditLogger = require('../middleware/auditLogger');
const AuditLog = require('../models/AuditLog');
const Joi = require('joi');
const validate = require('../middleware/validate');

const router = express.Router();

// Apply audit logger to all routes under /api/admin
router.use(auditLogger);

// ─────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────
const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

router.post('/login', validate(adminLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

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
// ─────────────────────────────────────────────
const createAdminSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

router.post('/', validate(createAdminSchema), async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

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
// DELETE /api/admin/:adminId
// Delete an admin account (cannot delete yourself)
// ─────────────────────────────────────────────
router.delete('/:adminId', adminAuth, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Prevent self-deletion
    if (adminId === req.adminId) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' });
    }

    const admin = await Admin.findByIdAndDelete(adminId);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    res.json({ message: `Admin "${admin.fullName}" deleted successfully` });
  } catch (err) {
    console.error('DELETE /api/admin/:adminId error:', err);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/audit-logs
// Get audit logs with pagination and date filter
// ─────────────────────────────────────────────
router.get('/audit-logs', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, from, to } = req.query;
    const query = {};

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to)   query.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(query)
    ]);

    res.json({ data: logs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('GET /api/admin/audit-logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/stats
// Dashboard overview stats (extended)
// ─────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const users = await User.find().select('registeredEvents createdAt userType referralCode isWaitlisted heardFrom');

    let paidUsers = 0;
    let totalRevenue = 0;
    let studentCount = 0;
    let professionalCount = 0;
    let waitlistCount = 0;
    let heardFromSocialMedia = 0;
    let heardFromNewspaper = 0;
    let heardFromOthers = 0;
    const referralBreakdown = {};

    users.forEach(u => {
      if (u.userType === 'student') {
        studentCount++;
      } else {
        professionalCount++;
      }

      if (u.isWaitlisted) {
        waitlistCount++;
      }

      if (u.heardFrom) {
        const h = u.heardFrom.trim();
        if (/social\s*media/i.test(h)) {
          heardFromSocialMedia++;
        } else if (/newspaper/i.test(h)) {
          heardFromNewspaper++;
        } else if (h !== '-' && h !== '') {
          heardFromOthers++;
        }
      }

      const confirmed = u.registeredEvents && u.registeredEvents.find(e => e.paymentStatus === 'confirmed');
      if (confirmed) {
        paidUsers++;
        totalRevenue += u.userType === 'student' ? 499 : 999;
      }

      if (u.referralCode) {
        if (!referralBreakdown[u.referralCode]) {
          referralBreakdown[u.referralCode] = { total: 0, students: 0, professionals: 0 };
        }
        referralBreakdown[u.referralCode].total += 1;
        if (u.userType === 'student') {
          referralBreakdown[u.referralCode].students += 1;
        } else {
          referralBreakdown[u.referralCode].professionals += 1;
        }
      }
    });

    const unpaidUsers = totalUsers - paidUsers;

    res.json({
      totalUsers,
      paidUsers,
      unpaidUsers,
      totalRevenue,
      studentCount,
      professionalCount,
      waitlistCount,
      referralBreakdown,
      heardFromSocialMedia,
      heardFromNewspaper,
      heardFromOthers
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users
// All registered users with pagination, search, and filtering
// ─────────────────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      filterPaid = 'all',
      filterType = 'all',
      filterWaitlist = 'all',
      filterReferral = 'all',
      filterActive = 'all',
      exportCsv = 'false',
      sortOrder = 'desc',
      filterProfile = 'all',
      filterHeardFrom = 'all',
      filterCohort = 'all',
      filterFeedback = 'all'
    } = req.query;

    const query = {};

    // Search
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { collegeName: { $regex: search, $options: 'i' } },
        { organization: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter Type
    if (filterType !== 'all') query.userType = filterType;

    // Filter Waitlist
    if (filterWaitlist === 'waitlisted') query.isWaitlisted = true;
    else if (filterWaitlist === 'regular') query.isWaitlisted = { $ne: true };

    // Filter Active
    if (filterActive === 'active') query.isActive = { $ne: false };
    else if (filterActive === 'inactive') query.isActive = false;

    // Filter Referral
    if (filterReferral !== 'all') query.referralCode = filterReferral;

    // Filter Paid
    if (filterPaid === 'paid') {
      query['registeredEvents'] = { $elemMatch: { paymentStatus: 'confirmed' } };
    } else if (filterPaid === 'unpaid') {
      query['registeredEvents'] = { $not: { $elemMatch: { paymentStatus: 'confirmed' } } };
    }

    // Filter Profile Status
    if (filterProfile === 'complete') {
      query.phone = { $exists: true, $ne: '' };
    } else if (filterProfile === 'incomplete') {
      query.$or = [{ phone: { $exists: false } }, { phone: '' }];
    }

    // Filter Heard From
    if (filterHeardFrom === 'social media') {
      query.heardFrom = { $regex: '^social\\s*media$', $options: 'i' };
    } else if (filterHeardFrom === 'newspaper') {
      query.heardFrom = { $regex: '^newspaper$', $options: 'i' };
    } else if (filterHeardFrom === 'others') {
      query.$and = [
        { heardFrom: { $exists: true } },
        { heardFrom: { $ne: '' } },
        { heardFrom: { $ne: '-' } },
        { heardFrom: { $nin: [/social\s*media/i, /newspaper/i] } }
      ];
    }

    // Filter Cohort Date
    if (filterCohort !== 'all') {
      query.selectedCohort = filterCohort;
    }

    // Filter Feedback Status
    if (filterFeedback === 'completed') {
      query.isFeedbackSubmitted = true;
    } else if (filterFeedback === 'pending') {
      query.isFeedbackSubmitted = { $ne: true };
    }

    const isExport = exportCsv === 'true';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    let usersQuery = User.find(query).sort({ createdAt: sortDir }).select('-otpHash -otpExpiry');

    if (!isExport) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      usersQuery = usersQuery.skip(skip).limit(parseInt(limit));
    }

    const [users, total, totalRegistrants] = await Promise.all([
      usersQuery.exec(),
      User.countDocuments(query),
      User.countDocuments()
    ]);

    const formatted = users.map(u => {
      const confirmed = u.registeredEvents && u.registeredEvents.find(e => e.paymentStatus === 'confirmed');
      const eventEntry = u.registeredEvents && u.registeredEvents.find(e => e.eventName === 'Lead with AI: Adopt, Implement and Transform');
      return {
        id:           u._id,
        fullName:     u.fullName,
        email:        u.email,
        phone:        u.phone,
        userType:     u.userType,
        heardFrom:    u.heardFrom || '-',
        isWaitlisted: u.isWaitlisted || false,
        isActive:     u.isActive !== false,
        referralCode: u.referralCode || '-',
        // Student fields
        collegeName:  u.collegeName  || '-',
        course:       u.course       || '-',
        year:         u.year         || '-',
        idCardPath:   u.idCardPath   || null,
        // Working professional fields
        domain:       u.domain       || '-',
        organization: u.organization || '-',
        // Country
        country:      u.country      || 'India',
        // Payment
        isPaid:    !!confirmed,
        paymentId: confirmed ? (confirmed.razorpayPaymentId || '-') : '-',
        zoomStatus: confirmed ? (confirmed.zoomRegistrationStatus || 'pending') : '-',
        emailStatus: confirmed ? (confirmed.emailConfirmationStatus || 'pending') : '-',
        isProfileComplete: u.isProfileComplete,
        isFeedbackSubmitted: u.isFeedbackSubmitted || false,
        selectedCohort: u.selectedCohort,
        createdAt: u.createdAt,
        // Nepal UPI proof details
        paymentMethod:          eventEntry ? eventEntry.paymentMethod : 'razorpay',
        nepalUpiTxnRef:         eventEntry ? eventEntry.nepalUpiTxnRef : null,
        nepalUpiScreenshotPath: eventEntry ? eventEntry.nepalUpiScreenshotPath : null,
      };
    });

    if (isExport) {
      return res.json({ data: formatted, total, totalRegistrants });
    }

    res.json({
      data: formatted,
      total,
      totalRegistrants,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users
// Admin manually registers a user
// ─────────────────────────────────────────────

const createRegistrantSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  userType: Joi.string().valid('student', 'working').optional(),
  referralCode: Joi.string().allow('', null).optional(),
  selectedCohort: Joi.string().valid(
    'June 13 & 14, 2026'
  ).allow('', null).optional()
});

router.post('/users', adminAuth, validate(createRegistrantSchema), async (req, res) => {
  try {
    const { fullName, email, userType, referralCode, selectedCohort } = req.body;

    // Check duplicate (case-insensitive email)
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    // Resolve referral code
    let mappedReferral = null;
    if (referralCode) {
      const settings = await Settings.getSingleton();
      const activeReferrals = settings.referralCodes.filter(r => r.isActive);
      const match = activeReferrals.find(r => r.code === referralCode.toLowerCase().trim());
      mappedReferral = match ? match.label : referralCode.trim();
    }

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      heardFrom: 'Admin Assisted Registration',
      referralCode: mappedReferral,
      selectedCohort: selectedCohort || null,
      isAdminCreated: true,
      registeredEvents: [{
        eventName: EVENT_NAME,
        paymentStatus: 'pending'
      }]
    };

    if (userType) {
      userData.userType = userType;
    }

    const user = await User.create(userData);

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = {
      fullName: user.fullName,
      userType: userType || 'unspecified',
      selectedCohort: user.selectedCohort
    };

    return res.status(201).json({
      message: 'Registrant created successfully.',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        selectedCohort: user.selectedCohort,
        isProfileComplete: user.isProfileComplete,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('POST /api/admin/users error:', err);
    res.status(500).json({ error: 'Failed to create registrant.' });
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
      isActive:     user.isActive !== false,
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
      zoomStatus:       confirmed ? (confirmed.zoomRegistrationStatus || 'pending') : '-',
      emailStatus:      confirmed ? (confirmed.emailConfirmationStatus || 'pending') : '-',
      isProfileComplete: user.isProfileComplete,
      registeredEvents: user.registeredEvents,
      createdAt:        user.createdAt,
    });
  } catch (err) {
    console.error('GET /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/users/:id
// Edit user fields
// ─────────────────────────────────────────────
const editUserSchema = Joi.object({
  fullName:     Joi.string().optional(),
  phone:        Joi.string().optional(),
  collegeName:  Joi.string().allow('', null).optional(),
  course:       Joi.string().allow('', null).optional(),
  year:         Joi.string().allow('', null).optional(),
  domain:       Joi.string().allow('', null).optional(),
  organization: Joi.string().allow('', null).optional(),
  heardFrom:    Joi.string().optional(),
  referralCode: Joi.string().allow('', null).optional(),
  country:      Joi.string().allow('', null).optional(),
  selectedCohort: Joi.string().valid(
    'June 13 & 14, 2026'
  ).allow('', null).optional()
});

router.patch('/users/:id', adminAuth, validate(editUserSchema), async (req, res) => {
  try {
    const allowedFields = ['fullName', 'phone', 'collegeName', 'course', 'year', 'domain', 'organization', 'heardFrom', 'selectedCohort', 'country'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.body.referralCode !== undefined) {
      let mappedReferral = null;
      if (req.body.referralCode && req.body.referralCode.trim() !== '') {
        const settings = await Settings.getSingleton();
        const activeReferrals = settings.referralCodes.filter(r => r.isActive);
        const match = activeReferrals.find(r => r.code === req.body.referralCode.toLowerCase().trim());
        mappedReferral = match ? match.label : req.body.referralCode.trim();
      }
      updates.referralCode = mappedReferral;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-otpHash -otpExpiry');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('PATCH /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// ─────────────────────────────────────────────
// PATCH /api/admin/users/:id/status
// Toggle a user's active/inactive status
// ─────────────────────────────────────────────
router.patch('/users/:id/status', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { 
      status: user.isActive ? 'Activated' : 'Deactivated',
      user: user.fullName 
    };

    res.json({
      message: `User "${user.fullName}" status updated.`,
      isActive: user.isActive
    });
  } catch (err) {
    console.error('PATCH /api/admin/users/:id/status error:', err);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/users/:id/waitlist
// Toggle a user's waitlist status
// ─────────────────────────────────────────────
router.patch('/users/:id/waitlist', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isWaitlisted = !user.isWaitlisted;
    await user.save();
    
    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { 
      action: user.isWaitlisted ? 'Waitlisted' : 'Removed from waitlist',
      user: user.fullName 
    };

    res.json({
      message: `User "${user.fullName}" is ${user.isWaitlisted ? 'now waitlisted' : 'removed from waitlist'}.`,
      isWaitlisted: user.isWaitlisted
    });
  } catch (err) {
    console.error('PATCH /api/admin/users/:id/waitlist error:', err);
    res.status(500).json({ error: 'Failed to toggle waitlist status' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/confirm-payment
// Manually confirm a user's payment
// ─────────────────────────────────────────────
const confirmPaymentSchema = Joi.object({
  razorpayPaymentId: Joi.string().required()
});

router.post('/users/:id/confirm-payment', adminAuth, validate(confirmPaymentSchema), async (req, res) => {
  try {
    const { razorpayPaymentId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';

    // Check if already confirmed
    const alreadyConfirmed = user.registeredEvents.find(e => e.eventName === EVENT_NAME && e.paymentStatus === 'confirmed');
    if (alreadyConfirmed) {
      return res.status(409).json({ error: 'User already has a confirmed payment for this event.' });
    }

    // Find or create the event entry
    let eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME);
    if (eventEntry && eventEntry.paymentMethod === 'nepal_upi') {
      if (!eventEntry.nepalUpiTxnRef) {
        return res.status(400).json({ error: 'No student-submitted transaction reference found to match.' });
      }
      if (eventEntry.nepalUpiTxnRef.trim().toLowerCase() !== razorpayPaymentId.trim().toLowerCase()) {
        return res.status(400).json({ error: `The transaction ID entered (${razorpayPaymentId}) does not match the reference ID submitted by the student (${eventEntry.nepalUpiTxnRef}).` });
      }
    }

    if (eventEntry) {
      eventEntry.razorpayPaymentId = razorpayPaymentId;
      eventEntry.paymentStatus = 'confirmed';
    } else {
      user.registeredEvents.push({
        eventName: EVENT_NAME,
        razorpayPaymentId,
        paymentStatus: 'confirmed'
      });
      eventEntry = user.registeredEvents[user.registeredEvents.length - 1];
    }

    // Register for Zoom
    try {
      const { registerForWebinar } = require('../utils/zoom');
      const [firstName, ...lastNameParts] = user.fullName.split(' ');
      const joinUrl = await registerForWebinar(user.email, firstName, lastNameParts.join(' '), user.selectedCohort);
      eventEntry.zoomJoinUrl = joinUrl;
      eventEntry.zoomRegistrationStatus = 'success';
    } catch (zoomErr) {
      console.error('Manual confirm — Zoom registration failed:', zoomErr);
      eventEntry.zoomRegistrationStatus = 'failed';
    }

    await user.save();

    // Send confirmation email (non-blocking)
    const { sendPaymentConfirmationEmail } = require('../utils/email');
    sendPaymentConfirmationEmail(user, EVENT_NAME, razorpayPaymentId, eventEntry.zoomJoinUrl)
      .then(async () => {
        eventEntry.emailConfirmationStatus = 'success';
        await user.save();
      })
      .catch(async (err) => {
        console.error('Manual confirm — email failed:', err);
        eventEntry.emailConfirmationStatus = 'failed';
        await user.save();
      });

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { user: user.fullName, action: 'Manual Payment Confirmed' };

    res.json({
      message: `Payment manually confirmed for "${user.fullName}".`,
      zoomStatus: eventEntry.zoomRegistrationStatus
    });
  } catch (err) {
    console.error('POST /api/admin/users/:id/confirm-payment error:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/reject-payment
// Manually reject a user's payment proof (Nepal UPI)
// ─────────────────────────────────────────────
const rejectPaymentSchema = Joi.object({
  reason: Joi.string().required()
});

router.post('/users/:id/reject-payment', adminAuth, validate(rejectPaymentSchema), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    let eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME);
    if (!eventEntry) {
      return res.status(404).json({ error: 'No registered event found for this user.' });
    }

    if (eventEntry.paymentStatus === 'confirmed') {
      return res.status(400).json({ error: 'Cannot reject an already confirmed payment.' });
    }

    // Delete proof screenshot if it exists
    if (eventEntry.nepalUpiScreenshotPath) {
      const fs = require('fs').promises;
      const path = require('path');
      const proofPath = path.join(__dirname, '../../uploads', eventEntry.nepalUpiScreenshotPath);
      await fs.unlink(proofPath).catch((e) => console.warn('Failed to delete rejected screenshot:', e.message));
    }

    // Reset Nepal Payment proof details
    eventEntry.paymentMethod = 'razorpay';
    eventEntry.nepalUpiTxnRef = undefined;
    eventEntry.nepalUpiScreenshotPath = undefined;
    eventEntry.paymentStatus = 'pending';

    await user.save();

    // Send payment rejection email (non-blocking)
    const { sendPaymentRejectionEmail } = require('../utils/email');
    sendPaymentRejectionEmail(user, EVENT_NAME, reason)
      .catch((err) => console.error('Failed sending rejection email:', err));

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { user: user.fullName, action: 'Manual Payment Rejected', reason };

    res.json({
      message: `Payment proof rejected for "${user.fullName}". Notification sent.`,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        country: user.country,
        registeredEvents: user.registeredEvents,
      }
    });

  } catch (err) {
    console.error('POST /api/admin/users/:id/reject-payment error:', err);
    res.status(500).json({ error: 'Failed to reject payment' });
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
    
    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { deleted_user: user.fullName };

    res.json({ message: `User "${user.fullName}" deleted successfully`, id: req.params.id });
  } catch (err) {
    console.error('DELETE /api/admin/users/:id error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/retry-zoom
// ─────────────────────────────────────────────
router.post('/users/:id/retry-zoom', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    const eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME && e.paymentStatus === 'confirmed');
    if (!eventEntry) return res.status(400).json({ error: 'User has no confirmed payment for this event' });

    const { registerForWebinar } = require('../utils/zoom');
    const [firstName, ...lastNameParts] = user.fullName.split(' ');

    const joinUrl = await registerForWebinar(user.email, firstName, lastNameParts.join(' '), user.selectedCohort);
    eventEntry.zoomJoinUrl = joinUrl;
    eventEntry.zoomRegistrationStatus = 'success';
    await user.save();

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { user: user.fullName };

    res.json({ message: 'Zoom registration successful', zoomJoinUrl: joinUrl });
  } catch (err) {
    console.error('Retry Zoom error:', err);
    res.status(500).json({ error: 'Failed to retry Zoom registration' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/register-zoom-all
// Batch register attendees in Zoom who are not registered yet
// ─────────────────────────────────────────────
router.post('/users/register-zoom-all', adminAuth, async (req, res) => {
  try {
    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    const users = await User.find({
      'registeredEvents': {
        $elemMatch: {
          eventName: EVENT_NAME,
          paymentStatus: 'confirmed',
          zoomRegistrationStatus: { $ne: 'success' }
        }
      }
    });

    if (users.length === 0) {
      return res.json({ message: 'All paid attendees are already registered in Zoom.', registeredCount: 0, failedCount: 0 });
    }

    const { registerForWebinar } = require('../utils/zoom');
    const { sendZoomJoinLinkEmail } = require('../utils/email');

    let registeredCount = 0;
    let failedCount = 0;
    const failures = [];

    for (const user of users) {
      const eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME && e.paymentStatus === 'confirmed');
      if (!eventEntry) continue;

      try {
        const [firstName, ...lastNameParts] = user.fullName.split(' ');
        const joinUrl = await registerForWebinar(user.email, firstName, lastNameParts.join(' '), user.selectedCohort);
        
        eventEntry.zoomJoinUrl = joinUrl;
        eventEntry.zoomRegistrationStatus = 'success';
        await user.save();

        // Send email with Zoom link
        await sendZoomJoinLinkEmail(user, EVENT_NAME, joinUrl);
        
        registeredCount++;
      } catch (err) {
        console.error(`Failed Zoom registration/email for ${user.email}:`, err.message);
        failedCount++;
        failures.push({ email: user.email, name: user.fullName, error: err.message });
      }
    }

    res.locals.auditTarget = 'all-unregistered-zoom';
    res.locals.auditDetails = { registeredCount, failedCount, failures };

    return res.json({
      message: `Zoom registration completed: ${registeredCount} succeeded, ${failedCount} failed.`,
      registeredCount,
      failedCount,
      failures
    });
  } catch (err) {
    console.error('Batch Zoom registration error:', err);
    res.status(500).json({ error: 'Failed to complete batch Zoom registration' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/users/:id/retry-email
// ─────────────────────────────────────────────
router.post('/users/:id/retry-email', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    const eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME && e.paymentStatus === 'confirmed');
    if (!eventEntry) return res.status(400).json({ error: 'User has no confirmed payment for this event' });

    const { sendPaymentConfirmationEmail } = require('../utils/email');
    await sendPaymentConfirmationEmail(user, EVENT_NAME, eventEntry.razorpayPaymentId, eventEntry.zoomJoinUrl);

    eventEntry.emailConfirmationStatus = 'success';
    await user.save();

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = { user: user.fullName };

    res.json({ message: 'Confirmation email sent successfully' });
  } catch (err) {
    console.error('Retry Email error:', err);
    res.status(500).json({ error: 'Failed to retry confirmation email' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/send-email
// Send bulk email to users
// ─────────────────────────────────────────────
const sendBulkEmailSchema = Joi.object({
  subject: Joi.string().required(),
  htmlContent: Joi.string().required(),
  recipientType: Joi.string().valid('all', 'paid', 'unpaid', 'waitlisted', 'first1000', 'custom').required(),
  customEmails: Joi.array().items(Joi.string().email()).when('recipientType', {
    is: 'custom',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  selectedCohort: Joi.string().allow('', null).optional()
});

router.post('/send-email', adminAuth, validate(sendBulkEmailSchema), async (req, res) => {
  try {
    const { subject, htmlContent, recipientType, customEmails, selectedCohort } = req.body;

    let targetEmails = [];
    const query = {};
    if (selectedCohort) {
      query.selectedCohort = selectedCohort;
    }

    if (recipientType === 'all') {
      const users = await User.find(query).select('email');
      targetEmails = users.map(u => u.email);
    } else if (recipientType === 'paid') {
      const users = await User.find(query).select('email registeredEvents');
      targetEmails = users
        .filter(u => u.registeredEvents && u.registeredEvents.some(e => e.paymentStatus === 'confirmed'))
        .map(u => u.email);
    } else if (recipientType === 'unpaid') {
      const users = await User.find(query).select('email registeredEvents isWaitlisted');
      targetEmails = users
        .filter(u => !u.isWaitlisted && !(u.registeredEvents && u.registeredEvents.some(e => e.paymentStatus === 'confirmed')))
        .map(u => u.email);
    } else if (recipientType === 'waitlisted') {
      const waitlistedQuery = { ...query, isWaitlisted: true };
      const users = await User.find(waitlistedQuery).select('email');
      targetEmails = users.map(u => u.email);
    } else if (recipientType === 'first1000') {
      const users = await User.find(query).sort({ createdAt: 1 }).limit(1000).select('email');
      targetEmails = users.map(u => u.email);
    } else if (recipientType === 'custom') {
      if (!customEmails || !Array.isArray(customEmails) || customEmails.length === 0)
        return res.status(400).json({ error: 'Custom emails array is required' });
      
      if (selectedCohort) {
        const users = await User.find({
          email: { $in: customEmails.map(e => e.toLowerCase().trim()) },
          selectedCohort
        }).select('email');
        targetEmails = users.map(u => u.email);
      } else {
        targetEmails = customEmails;
      }
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
// GET /api/admin/feedback
// All user feedback with pagination
// ─────────────────────────────────────────────
router.get('/feedback', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, session = '', exportCsv = 'false' } = req.query;

    const query = { isFeedbackSubmitted: true };

    let usersQuery = User.find(query)
      .sort({ updatedAt: -1 })
      .select('fullName email userType collegeName organization feedback isFeedbackSubmitted createdAt');

    const isExport = exportCsv === 'true';

    if (!isExport) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      usersQuery = usersQuery.skip(skip).limit(parseInt(limit));
    }

    const [users, total] = await Promise.all([
      usersQuery.exec(),
      User.countDocuments(query)
    ]);

    // Optionally filter by session client-side (feedback is stored per-session)
    const formatted = users.map(u => ({
      id:           u._id,
      fullName:     u.fullName,
      email:        u.email,
      userType:     u.userType,
      institution:  u.userType === 'student' ? (u.collegeName || '-') : (u.organization || '-'),
      feedback:     session
        ? u.feedback.filter(f => f.session.toLowerCase().includes(session.toLowerCase()))
        : u.feedback,
      createdAt:    u.createdAt,
    })).filter(u => u.feedback.length > 0);

    if (isExport) {
      return res.json({ data: formatted, total });
    }

    res.json({ data: formatted, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('GET /api/admin/feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/settings
// Get system settings
// ─────────────────────────────────────────────
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
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
const feedbackSettingsSchema = Joi.object({
  feedbackEnabled: Joi.boolean().required()
});

router.patch('/settings/feedback', adminAuth, validate(feedbackSettingsSchema), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    settings.feedbackEnabled = req.body.feedbackEnabled;
    await settings.save();
    
    res.locals.auditDetails = { status: settings.feedbackEnabled ? 'Enabled' : 'Disabled' };

    res.json(settings);
  } catch (err) {
    console.error('Admin update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/settings/maintenance
// Toggle maintenance mode
// ─────────────────────────────────────────────
const maintenanceSettingsSchema = Joi.object({
  isMaintenanceMode: Joi.boolean().required()
});

router.patch('/settings/maintenance', adminAuth, validate(maintenanceSettingsSchema), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    settings.isMaintenanceMode = req.body.isMaintenanceMode;
    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error('Admin update maintenance mode error:', err);
    res.status(500).json({ error: 'Failed to update maintenance mode' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/settings/cap
// Update the registration cap
// ─────────────────────────────────────────────
const capSchema = Joi.object({
  registrationCap: Joi.number().integer().min(1).required()
});

router.patch('/settings/cap', adminAuth, validate(capSchema), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    settings.registrationCap = req.body.registrationCap;
    await settings.save();
    res.json({ message: `Registration cap updated to ${settings.registrationCap}.`, registrationCap: settings.registrationCap });
  } catch (err) {
    console.error('PATCH /api/admin/settings/cap error:', err);
    res.status(500).json({ error: 'Failed to update registration cap' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/settings/referrals
// List all referral codes
// ─────────────────────────────────────────────
router.get('/settings/referrals', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json(settings.referralCodes);
  } catch (err) {
    console.error('GET /api/admin/settings/referrals error:', err);
    res.status(500).json({ error: 'Failed to fetch referral codes' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/settings/referrals
// Add a new referral code
// ─────────────────────────────────────────────
const addReferralSchema = Joi.object({
  code:  Joi.string().required(),
  label: Joi.string().required()
});

router.post('/settings/referrals', adminAuth, validate(addReferralSchema), async (req, res) => {
  try {
    const { code, label } = req.body;
    const settings = await Settings.getSingleton();

    const exists = settings.referralCodes.find(r => r.code === code.toLowerCase());
    if (exists) return res.status(409).json({ error: 'A referral code with this key already exists.' });

    settings.referralCodes.push({ code: code.toLowerCase(), label, isActive: true });
    await settings.save();

    res.locals.auditDetails = { added_code: code.toLowerCase(), label };

    res.status(201).json({ message: 'Referral code added.', referralCodes: settings.referralCodes });
  } catch (err) {
    console.error('POST /api/admin/settings/referrals error:', err);
    res.status(500).json({ error: 'Failed to add referral code' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/settings/referrals/:code
// Toggle active status of a referral code
// ─────────────────────────────────────────────
router.patch('/settings/referrals/:code', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const entry = settings.referralCodes.find(r => r.code === req.params.code.toLowerCase());
    if (!entry) return res.status(404).json({ error: 'Referral code not found.' });

    entry.isActive = !entry.isActive;
    await settings.save();

    res.locals.auditDetails = { status: entry.isActive ? 'Activated' : 'Deactivated' };

    res.json({
      message: `Referral code "${entry.code}" is now ${entry.isActive ? 'active' : 'inactive'}.`,
      referralCodes: settings.referralCodes
    });
  } catch (err) {
    console.error('PATCH /api/admin/settings/referrals/:code error:', err);
    res.status(500).json({ error: 'Failed to update referral code' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/admin/settings/referrals/:code/label
// Update the label of a referral code
// ─────────────────────────────────────────────
const updateReferralLabelSchema = Joi.object({
  label: Joi.string().required()
});

router.put('/settings/referrals/:code/label', adminAuth, validate(updateReferralLabelSchema), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const entry = settings.referralCodes.find(r => r.code === req.params.code.toLowerCase());
    if (!entry) return res.status(404).json({ error: 'Referral code not found.' });

    entry.label = req.body.label.trim();
    await settings.save();

    res.locals.auditDetails = { new_label: entry.label };

    res.json({
      message: `Referral code "${entry.code}" label updated to "${entry.label}".`,
      referralCodes: settings.referralCodes
    });
  } catch (err) {
    console.error('PUT /api/admin/settings/referrals/:code/label error:', err);
    res.status(500).json({ error: 'Failed to update referral label' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/admin/settings/referrals/:code
// Delete a referral code
// ─────────────────────────────────────────────
router.delete('/settings/referrals/:code', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const initialLen = settings.referralCodes.length;
    settings.referralCodes = settings.referralCodes.filter(r => r.code !== req.params.code.toLowerCase());

    if (settings.referralCodes.length === initialLen) {
      return res.status(404).json({ error: 'Referral code not found.' });
    }

    await settings.save();
    
    res.locals.auditDetails = { deleted_code: req.params.code.toLowerCase() };
    
    res.json({ message: `Referral code "${req.params.code}" deleted.`, referralCodes: settings.referralCodes });
  } catch (err) {
    console.error('DELETE /api/admin/settings/referrals/:code error:', err);
    res.status(500).json({ error: 'Failed to delete referral code' });
  }
});
// ─────────────────────────────────────────────
// POST /api/admin/settings/send-reminders
// Trigger / Schedule reminders for upcoming cohort
// ─────────────────────────────────────────────
router.post('/settings/send-reminders', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();

    settings.activeReminderCohort = 'June 13 & 14, 2026';
    await settings.save();

    res.locals.auditDetails = {
      cohort: 'June 13 & 14, 2026',
      action: 'Reminder Schedule Activated'
    };

    return res.json({
      message: 'Cohort reminders successfully scheduled for June 13 & 14, 2026. Day 1 email will be sent on June 12 at 10:00 AM IST and Day 2 email will be sent on June 13 at 6:30 PM IST.',
      cohort: 'June 13 & 14, 2026',
      activeReminderCohort: 'June 13 & 14, 2026'
    });
  } catch (err) {
    console.error('POST /api/admin/settings/send-reminders error:', err);
    res.status(500).json({ error: 'Failed to schedule reminders: ' + err.message });
  }
});

// POST /api/admin/settings/cancel-reminders
// Deactivate / cancel reminders for upcoming cohort
router.post('/settings/cancel-reminders', adminAuth, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();

    settings.activeReminderCohort = null;
    await settings.save();

    res.locals.auditDetails = {
      action: 'Reminder Schedule Cancelled'
    };

    return res.json({
      message: 'Cohort reminders schedule successfully cancelled.',
      activeReminderCohort: null
    });
  } catch (err) {
    console.error('POST /api/admin/settings/cancel-reminders error:', err);
    res.status(500).json({ error: 'Failed to cancel reminders: ' + err.message });
  }
});

module.exports = router;

