const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendCustomBulkEmail, sendProfileApprovedEmail } = require('../utils/email');
const adminAuth = require('../middleware/adminAuth');
const auditLogger = require('../middleware/auditLogger');
const AuditLog = require('../models/AuditLog');
const fs = require('fs').promises;
const Joi = require('joi');
const validate = require('../middleware/validate');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `id-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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
    const { cohort = 'all', referral = 'all', source = 'all' } = req.query;
    const activeSource = source !== 'all' ? source : referral;
    const query = {};
    if (cohort !== 'all') {
      if (cohort === '-') {
        query.$or = [
          { selectedCohort: null },
          { selectedCohort: '' },
          { selectedCohort: '-' }
        ];
      } else {
        query.selectedCohort = cohort;
      }
    }
    if (activeSource !== 'all') {
      if (activeSource === '-') {
        query.$or = [
          { referralCode: null },
          { referralCode: '' },
          { referralCode: '-' }
        ];
      } else if (activeSource === 'social media') {
        query.heardFrom = { $regex: '^social\\s*media$', $options: 'i' };
        query.$or = [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }];
      } else if (activeSource === 'newspaper') {
        query.heardFrom = { $regex: '^newspaper$', $options: 'i' };
        query.$or = [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }];
      } else if (activeSource === 'gkt employee') {
        query.heardFrom = { $regex: 'gkt\\s*employee', $options: 'i' };
        query.$or = [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }];
      } else if (activeSource === 'others') {
        query.$and = [
          { heardFrom: { $exists: true } },
          { heardFrom: { $ne: '' } },
          { heardFrom: { $ne: '-' } },
          { heardFrom: { $nin: [/social\s*media/i, /newspaper/i, /gkt\s*employee/i] } }
        ];
        query.$or = [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }];
      } else {
        const escaped = activeSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { referralCode: activeSource },
          { referralCode: { $regex: new RegExp(escaped, 'i') } }
        ];
      }
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query).select('registeredEvents createdAt userType referralCode isWaitlisted heardFrom selectedCohort collegeName organization country salesperson');

    let paidUsers = 0;
    let totalRevenue = 0;
    let studentCount = 0;
    let professionalCount = 0;
    let paidStudentCount = 0;
    let paidProfessionalCount = 0;
    let waitlistCount = 0;
    let heardFromSocialMedia = 0;
    let heardFromNewspaper = 0;
    let heardFromGktEmployee = 0;
    let heardFromOthers = 0;
    const referralBreakdown = {};
    const revenueSplit = {};

    const salespersonReport = {};
    const collegeReport = {};
    const organizationReport = {};
    const countryReport = {};
    const noReferralBreakdown = {
      'Social Media': { students: 0, professionals: 0, revenue: 0 },
      'Newspaper':    { students: 0, professionals: 0, revenue: 0 },
      'Others':       { students: 0, professionals: 0, revenue: 0 }
    };

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';

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
        } else if (/gkt\s*employee/i.test(h)) {
          heardFromGktEmployee++;
        } else if (h !== '-' && h !== '') {
          heardFromOthers++;
        }
      }

      const confirmed = u.registeredEvents && u.registeredEvents.find(e => e.paymentStatus === 'confirmed');
      let amtPaid = 0;
      if (confirmed) {
        paidUsers++;
        amtPaid = confirmed.amountPaid !== undefined ? confirmed.amountPaid : (u.userType === 'student' ? 499 : 999);
        totalRevenue += amtPaid;
        if (u.userType === 'student') {
          paidStudentCount++;
        } else {
          paidProfessionalCount++;
        }

        // Group by userType and amtPaid for the detailed split
        const typeLabel = u.userType === 'student' ? 'Students' : 'Professionals';
        const splitKey = `${typeLabel}-${amtPaid}`;
        if (!revenueSplit[splitKey]) {
          revenueSplit[splitKey] = {
            category: typeLabel,
            rate: amtPaid,
            count: 0,
            revenue: 0
          };
        }
        revenueSplit[splitKey].count++;
        revenueSplit[splitKey].revenue += amtPaid;
      }

      if (confirmed) {
        let sourceKey = null;
        if (u.referralCode && u.referralCode.trim() && u.referralCode !== '-') {
          sourceKey = u.referralCode.trim();
        }

        if (sourceKey) {
          if (!referralBreakdown[sourceKey]) {
            referralBreakdown[sourceKey] = { total: 0, students: 0, professionals: 0, revenue: 0 };
          }
          referralBreakdown[sourceKey].total += 1;
          if (u.userType === 'student') {
            referralBreakdown[sourceKey].students += 1;
          } else {
            referralBreakdown[sourceKey].professionals += 1;
          }
          referralBreakdown[sourceKey].revenue += amtPaid;
        }
      }

      // Salesperson report
      if (u.salesperson) {
        const sp = u.salesperson.trim();
        if (confirmed) {
          if (!salespersonReport[sp]) {
            salespersonReport[sp] = { registrations: 0, revenue: 0 };
          }
          salespersonReport[sp].registrations++;
          salespersonReport[sp].revenue += amtPaid;
        }
      }

      // Determine source bucket for this user (shared helper)
      const _getSourceBucket = (user) => {
        if (user.referralCode && user.referralCode.trim()) return 'Referral';
        const h = (user.heardFrom || '').trim();
        if (/social\s*media/i.test(h)) return 'Social Media';
        if (/newspaper/i.test(h)) return 'Newspaper';
        return 'Others';
      };
      const _sourceBucket = _getSourceBucket(u);

      // College report
      if (u.userType === 'student' && u.collegeName) {
        const colName = u.collegeName.trim();
        if (colName && colName !== '-') {
          if (confirmed) {
            if (!collegeReport[colName]) {
              collegeReport[colName] = { registrations: 0, revenue: 0, byReferral: {}, bySource: {} };
            }
            collegeReport[colName].registrations++;
            collegeReport[colName].revenue += amtPaid;
            
            // bySource (grouped by rate)
            const sourceKey = _sourceBucket;
            if (!collegeReport[colName].bySource[sourceKey]) {
              collegeReport[colName].bySource[sourceKey] = {};
            }
            if (!collegeReport[colName].bySource[sourceKey][amtPaid]) {
              collegeReport[colName].bySource[sourceKey][amtPaid] = { count: 0, revenue: 0 };
            }
            collegeReport[colName].bySource[sourceKey][amtPaid].count++;
            collegeReport[colName].bySource[sourceKey][amtPaid].revenue += amtPaid;

            // byReferral (grouped by rate)
            if (u.referralCode && u.referralCode.trim()) {
              const refKey = u.referralCode.trim();
              if (!collegeReport[colName].byReferral[refKey]) {
                collegeReport[colName].byReferral[refKey] = {};
              }
              if (!collegeReport[colName].byReferral[refKey][amtPaid]) {
                collegeReport[colName].byReferral[refKey][amtPaid] = { count: 0, revenue: 0 };
              }
              collegeReport[colName].byReferral[refKey][amtPaid].count++;
              collegeReport[colName].byReferral[refKey][amtPaid].revenue += amtPaid;
            }
          }
        }
      }

      // Organization report
      if (u.userType === 'working' && u.organization) {
        const orgName = u.organization.trim();
        if (orgName && orgName !== '-') {
          if (confirmed) {
            if (!organizationReport[orgName]) {
              organizationReport[orgName] = { registrations: 0, revenue: 0, byReferral: {}, bySource: {} };
            }
            organizationReport[orgName].registrations++;
            organizationReport[orgName].revenue += amtPaid;
            
            // bySource (grouped by rate)
            const sourceKey = _sourceBucket;
            if (!organizationReport[orgName].bySource[sourceKey]) {
              organizationReport[orgName].bySource[sourceKey] = {};
            }
            if (!organizationReport[orgName].bySource[sourceKey][amtPaid]) {
              organizationReport[orgName].bySource[sourceKey][amtPaid] = { count: 0, revenue: 0 };
            }
            organizationReport[orgName].bySource[sourceKey][amtPaid].count++;
            organizationReport[orgName].bySource[sourceKey][amtPaid].revenue += amtPaid;

            // byReferral (grouped by rate)
            if (u.referralCode && u.referralCode.trim()) {
              const refKey = u.referralCode.trim();
              if (!organizationReport[orgName].byReferral[refKey]) {
                organizationReport[orgName].byReferral[refKey] = {};
              }
              if (!organizationReport[orgName].byReferral[refKey][amtPaid]) {
                organizationReport[orgName].byReferral[refKey][amtPaid] = { count: 0, revenue: 0 };
              }
              organizationReport[orgName].byReferral[refKey][amtPaid].count++;
              organizationReport[orgName].byReferral[refKey][amtPaid].revenue += amtPaid;
            }
          }
        }
      }

      // noReferralBreakdown — paid users with NO referral code
      if (confirmed && (!u.referralCode || !u.referralCode.trim())) {
        const bucket = _sourceBucket === 'Referral' ? 'Others' : _sourceBucket; // safety guard
        if (!noReferralBreakdown[bucket]) {
          noReferralBreakdown[bucket] = { students: 0, professionals: 0, revenue: 0 };
        }
        if (u.userType === 'student') {
          noReferralBreakdown[bucket].students++;
        } else {
          noReferralBreakdown[bucket].professionals++;
        }
        noReferralBreakdown[bucket].revenue += amtPaid;
      }

      // Country report
      const countryName = u.country || 'India';
      if (confirmed) {
        if (!countryReport[countryName]) {
          countryReport[countryName] = { registrations: 0, revenue: 0 };
        }
        countryReport[countryName].registrations++;
        countryReport[countryName].revenue += amtPaid;
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
      paidStudentCount,
      paidProfessionalCount,
      waitlistCount,
      referralBreakdown,
      heardFromSocialMedia,
      heardFromNewspaper,
      heardFromGktEmployee,
      heardFromOthers,
      salespersonReport,
      collegeReport,
      organizationReport,
      countryReport,
      noReferralBreakdown,
      revenueSplit: Object.values(revenueSplit)
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
      filterSource = 'all',
      filterCohort = 'all',
      filterFeedback = 'all',
      filterCertSent = 'all',
      filterCountry = 'all'
    } = req.query;

    const query = {};
    const andConditions = [];

    // Search
    if (search) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { collegeName: { $regex: search, $options: 'i' } },
          { organization: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Filter Type
    if (filterType !== 'all') query.userType = filterType;

    // Filter Waitlist
    if (filterWaitlist === 'waitlisted') query.isWaitlisted = true;
    else if (filterWaitlist === 'regular') query.isWaitlisted = { $ne: true };

    // Filter Active
    if (filterActive === 'active') query.isActive = { $ne: false };
    else if (filterActive === 'inactive') query.isActive = false;

    // Filter Referral and Heard From consolidated (with multiple sources support)
    const consolidatedSource = filterSource !== 'all' ? filterSource : (filterReferral !== 'all' ? filterReferral : filterHeardFrom);
    if (consolidatedSource && consolidatedSource !== 'all') {
      const sources = consolidatedSource.split(',').map(s => s.trim()).filter(Boolean);
      if (sources.length > 0) {
        const sourceConditions = sources.map(src => {
          if (src === '-') {
            return {
              $or: [
                { referralCode: null },
                { referralCode: '' },
                { referralCode: '-' }
              ]
            };
          } else if (src.toLowerCase() === 'social media') {
            return {
              heardFrom: { $regex: /^social\s*media$/i },
              $or: [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }]
            };
          } else if (src.toLowerCase() === 'newspaper') {
            return {
              heardFrom: { $regex: /^newspaper$/i },
              $or: [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }]
            };
          } else if (src.toLowerCase() === 'gkt employee') {
            return {
              heardFrom: { $regex: /gkt\s*employee/i },
              $or: [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }]
            };
          } else if (src.toLowerCase() === 'others') {
            return {
              heardFrom: {
                $exists: true,
                $ne: '',
                $nin: [/social\s*media/i, /newspaper/i, /gkt\s*employee/i, /-/]
              },
              $or: [{ referralCode: null }, { referralCode: '' }, { referralCode: '-' }]
            };
          } else {
            const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return {
              $or: [
                { referralCode: src },
                { referralCode: { $regex: new RegExp(escaped, 'i') } }
              ]
            };
          }
        });
        if (sourceConditions.length > 0) {
          andConditions.push({ $or: sourceConditions });
        }
      }
    }

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
      andConditions.push({
        $or: [{ phone: { $exists: false } }, { phone: '' }]
      });
    }

    // Filter Cohort Date
    if (filterCohort !== 'all') {
      if (filterCohort === '-') {
        andConditions.push({
          $or: [
            { selectedCohort: null },
            { selectedCohort: '' },
            { selectedCohort: '-' }
          ]
        });
      } else {
        query.selectedCohort = filterCohort;
      }
    }

    // Filter Feedback Status
    if (filterFeedback === 'completed') {
      query.isFeedbackSubmitted = true;
    } else if (filterFeedback === 'pending') {
      query.isFeedbackSubmitted = { $ne: true };
    }

    // Filter Certificate Sent Status
    if (filterCertSent === 'sent') {
      query.isCertificateSent = true;
    } else if (filterCertSent === 'not_sent') {
      query.isCertificateSent = { $ne: true };
    }

    // Filter Country (India/Nepal)
    if (filterCountry !== 'all') {
      if (filterCountry.toLowerCase() === 'india') {
        andConditions.push({
          $or: [
            { country: { $regex: /^india$/i } },
            { country: null },
            { country: '' }
          ]
        });
      } else {
        query.country = { $regex: new RegExp(`^${filterCountry}$`, 'i') };
      }
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
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
        salesperson:  u.salesperson || null,
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
        isCertificateSent:      u.isCertificateSent || false,
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
  userType: Joi.string().valid('student', 'working').required(),
  phone: Joi.string().allow('', null).optional(),
  collegeName: Joi.string().allow('', null).optional(),
  course: Joi.string().allow('', null).optional(),
  year: Joi.string().allow('', null).optional(),
  domain: Joi.string().allow('', null).optional(),
  organization: Joi.string().allow('', null).optional(),
  referralCode: Joi.string().allow('', null).optional(),
  selectedCohort: Joi.string().required(),
  paymentStatus: Joi.string().valid('pending', 'confirmed').default('pending').optional(),
  customPaymentAmount: Joi.number().min(0).optional(),
  heardFrom: Joi.string().allow('', null).optional(),
  heardFromOther: Joi.string().allow('', null).optional(),
  referralName: Joi.string().allow('', null).optional(),
  country: Joi.string().allow('', null).optional(),
});

router.post('/users', adminAuth, upload.single('idCard'), validate(createRegistrantSchema), async (req, res) => {
  try {
    const {
      fullName,
      email,
      userType,
      phone,
      collegeName,
      course,
      year,
      domain,
      organization,
      referralCode,
      selectedCohort,
      paymentStatus,
      customPaymentAmount,
      heardFrom,
      heardFromOther,
      referralName,
      country,
    } = req.body;

    // Check duplicate (case-insensitive email)
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const settings = await Settings.getSingleton();

    // Resolve referral code & salesperson
    let mappedReferral = null;
    let finalSalesperson = null;

    if (referralCode) {
      const activeReferrals = settings.referralCodes.filter(r => r.isActive);
      const match = activeReferrals.find(r => r.code === referralCode.toLowerCase().trim());
      mappedReferral = match ? match.label : referralCode.trim();
    }

    let finalHeardFrom = heardFrom?.trim() || 'Admin Assisted Registration';
    if (finalHeardFrom === 'Others') {
      finalHeardFrom = heardFromOther?.trim() || 'Others';
    }

    if (heardFrom === 'GKT Employee') {
      finalSalesperson = referralName?.trim() || null;
      if (finalSalesperson) {
        const activeReferrals = settings.referralCodes ? settings.referralCodes.filter(r => r.isActive) : [];
        const matchedRef = activeReferrals.find(r => r.label === finalSalesperson);
        if (matchedRef) {
          mappedReferral = matchedRef.label;
        }
      }
    }

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    const eventEntry = {
      eventName: EVENT_NAME,
      paymentStatus: paymentStatus || 'pending',
      paymentMethod: 'razorpay',
      amountPaid: customPaymentAmount !== undefined ? customPaymentAmount : (userType === 'student' ? 499 : 999)
    };
    if (paymentStatus === 'confirmed') {
      eventEntry.razorpayPaymentId = 'manual_' + Date.now();
    }

    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      userType,
      heardFrom: finalHeardFrom,
      referralCode: mappedReferral,
      salesperson: finalSalesperson,
      selectedCohort: selectedCohort || null,
      country: country || 'India',
      isAdminCreated: true,
      registeredEvents: [eventEntry]
    };

    if (userType === 'student') {
      userData.collegeName = collegeName?.trim() || undefined;
      userData.course = course?.trim() || undefined;
      userData.year = year?.trim() || undefined;
      if (req.file) {
        userData.idCardPath = req.file.filename;
      }
    } else {
      userData.domain = domain?.trim() || undefined;
      userData.organization = organization?.trim() || undefined;
    }

    const user = await User.create(userData);

    // Audit price override
    if (customPaymentAmount !== undefined) {
      await AuditLog.create({
        adminId: req.adminId,
        action: 'PRICE_OVERRIDE',
        target: email.toLowerCase().trim(),
        details: `Custom payment amount of ₹${customPaymentAmount} set by admin manually creating registrant.`,
      });
    }

    // Register for Zoom if confirmed
    if (paymentStatus === 'confirmed') {
      let zoomJoinUrl = null;
      try {
        const { registerForWebinar } = require('../utils/zoom');
        const [firstName, ...lastNameParts] = user.fullName.split(' ');
        const joinUrl = await registerForWebinar(user.email, firstName, lastNameParts.join(' '), selectedCohort);
        zoomJoinUrl = joinUrl;
        
        await User.updateOne(
          { _id: user._id, 'registeredEvents.eventName': EVENT_NAME },
          { 
            $set: { 
              'registeredEvents.$.zoomJoinUrl': joinUrl,
              'registeredEvents.$.zoomRegistrationStatus': 'success'
            } 
          }
        );
      } catch (zoomErr) {
        console.error('Admin manual confirm zoom error:', zoomErr);
        await User.updateOne(
          { _id: user._id, 'registeredEvents.eventName': EVENT_NAME },
          { $set: { 'registeredEvents.$.zoomRegistrationStatus': 'failed' } }
        );
      }

      // Send payment confirmation email (non-blocking)
      const razorpayPaymentId = eventEntry.razorpayPaymentId || ('manual_' + Date.now());
      const { sendPaymentConfirmationEmail } = require('../utils/email');
      
      User.findById(user._id)
        .then(async (updatedUser) => {
          if (updatedUser) {
            await sendPaymentConfirmationEmail(updatedUser, EVENT_NAME, razorpayPaymentId, zoomJoinUrl);
            await User.updateOne(
              { _id: updatedUser._id, 'registeredEvents.eventName': EVENT_NAME },
              { $set: { 'registeredEvents.$.emailConfirmationStatus': 'success' } }
            );
          }
        })
        .catch(async (err) => {
          console.error('Admin manual creation email failed:', err);
          await User.updateOne(
            { _id: user._id, 'registeredEvents.eventName': EVENT_NAME },
            { $set: { 'registeredEvents.$.emailConfirmationStatus': 'failed' } }
          );
        });
    }

    res.locals.auditTarget = user.email;
    res.locals.auditDetails = {
      fullName: user.fullName,
      userType,
      selectedCohort: user.selectedCohort,
      customPaymentAmount,
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
      referralCode: user.referralCode || null,
      salesperson:  user.salesperson || null,
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
      isCertificateSent: user.isCertificateSent || false,
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
  fullName:       Joi.string().optional(),
  phone:          Joi.string().allow('', null).optional(),
  collegeName:    Joi.string().allow('', null).optional(),
  course:         Joi.string().allow('', null).optional(),
  year:           Joi.string().allow('', null).optional(),
  domain:         Joi.string().allow('', null).optional(),
  organization:   Joi.string().allow('', null).optional(),
  heardFrom:      Joi.string().allow('', null).optional(),
  heardFromOther: Joi.string().allow('', null).optional(),
  referralName:   Joi.string().allow('', null).optional(),
  referralCode:   Joi.string().allow('', null).optional(),
  country:        Joi.string().allow('', null).optional(),
  selectedCohort: Joi.string().allow('', null).optional()
});

router.patch('/users/:id', adminAuth, upload.single('idCard'), validate(editUserSchema), async (req, res) => {
  try {
    const allowedFields = ['fullName', 'phone', 'collegeName', 'course', 'year', 'domain', 'organization', 'selectedCohort', 'country'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    // Handle ID Card file upload
    if (req.file) {
      updates.idCardPath = req.file.filename;
    }

    // Handle referralCode (direct setting/override) if provided
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

    // Resolve heardFrom details if heardFrom field is provided
    if (req.body.heardFrom !== undefined) {
      const settings = await Settings.getSingleton();
      const activeReferrals = settings.referralCodes.filter(r => r.isActive);

      let finalHeardFrom = req.body.heardFrom?.trim() || '';
      let finalSalesperson = null;
      let finalReferralCode = null;

      if (finalHeardFrom === 'Others') {
        finalHeardFrom = req.body.heardFromOther?.trim() || 'Others';
      } else if (req.body.heardFrom === 'GKT Employee') {
        finalSalesperson = req.body.referralName?.trim() || null;
        if (finalSalesperson) {
          // Auto-assign: find the referral code whose label matches the selected salesperson
          const matchedRef = activeReferrals.find(r => r.label === finalSalesperson);
          if (matchedRef) {
            finalReferralCode = matchedRef.label;
          }
        }
        finalHeardFrom = 'GKT Employee';
      }

      updates.heardFrom = finalHeardFrom;
      updates.salesperson = finalSalesperson;
      if (req.body.heardFrom === 'GKT Employee' && finalReferralCode) {
        updates.referralCode = finalReferralCode;
      } else if (req.body.heardFrom !== 'GKT Employee' && req.body.referralCode === undefined) {
        // Clear referral/salesperson if it's no longer GKT Employee and no referral code is supplied
        updates.salesperson = null;
        updates.referralCode = null;
      }
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
      if (!eventEntry.amountPaid) {
        eventEntry.amountPaid = user.userType === 'student' ? 499 : 999;
      }
    } else {
      user.registeredEvents.push({
        eventName: EVENT_NAME,
        razorpayPaymentId,
        paymentStatus: 'confirmed',
        amountPaid: user.userType === 'student' ? 499 : 999
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
    const { page = 1, limit = 20, session = '', cohort = '', rating = '', sortRating = '', exportCsv = 'false' } = req.query;

    const query = { isFeedbackSubmitted: true };
    if (cohort) {
      query.selectedCohort = cohort;
    }
    if (rating) {
      if (cohort && cohort !== 'June 13 & 14, 2026') {
        // For June 27 & 28 (and future cohorts), overall rating is the first question
        query['feedback.0.rating'] = rating;
      } else {
        if (session) {
          query.feedback = {
            $elemMatch: {
              session: new RegExp(session, 'i'),
              rating: rating
            }
          };
        } else {
          query.feedback = {
            $elemMatch: {
              rating: rating
            }
          };
        }
      }
    }

    let sortObj = { updatedAt: -1 };
    if (cohort && cohort !== 'June 13 & 14, 2026') {
      if (sortRating === 'desc') {
        sortObj = { 'feedback.0.rating': -1, updatedAt: -1 };
      } else if (sortRating === 'asc') {
        sortObj = { 'feedback.0.rating': 1, updatedAt: -1 };
      }
    }

    let usersQuery = User.find(query)
      .sort(sortObj)
      .select('fullName email userType collegeName organization feedback isFeedbackSubmitted selectedCohort createdAt');

    const isExport = exportCsv === 'true';

    if (!isExport) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      usersQuery = usersQuery.skip(skip).limit(parseInt(limit));
    }

    const [users, total] = await Promise.all([
      usersQuery.exec(),
      User.countDocuments(query)
    ]);

    // Return full feedback array so that the frontend can display all sessions
    const formatted = users.map(u => ({
      id:           u._id,
      fullName:     u.fullName,
      email:        u.email,
      userType:     u.userType,
      institution:  u.userType === 'student' ? (u.collegeName || '-') : (u.organization || '-'),
      feedback:     u.feedback,
      createdAt:    u.createdAt,
      selectedCohort: u.selectedCohort,
    }));

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
// PATCH /api/admin/settings/feedback/cohorts
// Toggle feedback status for a specific cohort
// ─────────────────────────────────────────────
const feedbackCohortSchema = Joi.object({
  cohort: Joi.string().required(),
  enabled: Joi.boolean().required()
});

router.patch('/settings/feedback/cohorts', adminAuth, validate(feedbackCohortSchema), async (req, res) => {
  try {
    const { cohort, enabled } = req.body;
    const settings = await Settings.getSingleton();
    if (!settings.feedbackEnabledCohorts) {
      settings.feedbackEnabledCohorts = [];
    }
    if (enabled) {
      if (!settings.feedbackEnabledCohorts.includes(cohort)) {
        settings.feedbackEnabledCohorts.push(cohort);
      }
    } else {
      settings.feedbackEnabledCohorts = settings.feedbackEnabledCohorts.filter(c => c !== cohort);
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error('Update cohort feedback error:', err);
    res.status(500).json({ error: 'Failed to update cohort feedback.' });
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
// PATCH /api/admin/settings/group-additions
// Toggle allowing profile group additions
// ─────────────────────────────────────────────
const groupAdditionsSchema = Joi.object({
  allowProfileGroupAdditions: Joi.boolean().required()
});

router.patch('/settings/group-additions', adminAuth, validate(groupAdditionsSchema), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    settings.allowProfileGroupAdditions = req.body.allowProfileGroupAdditions;
    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error('PATCH /api/admin/settings/group-additions error:', err);
    res.status(500).json({ error: 'Failed to update group additions setting' });
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
// GET /api/admin/settings/cohorts/:cohort/count
// Count registrants for a given cohort
// ─────────────────────────────────────────────
router.get('/settings/cohorts/:cohort/count', adminAuth, async (req, res) => {
  try {
    const cohort = decodeURIComponent(req.params.cohort);
    const count = await User.countDocuments({ selectedCohort: cohort });
    return res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to count cohort registrants.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/settings/cohorts
// Add a cohort
// ─────────────────────────────────────────────
const addCohortSchema = Joi.object({
  cohort: Joi.string().required()
});
router.post('/settings/cohorts', adminAuth, validate(addCohortSchema), async (req, res) => {
  try {
    const { cohort } = req.body;
    const settings = await Settings.getSingleton();
    if (settings.cohorts.includes(cohort)) {
      return res.status(400).json({ error: 'Cohort date already exists.' });
    }
    settings.cohorts.push(cohort);
    await settings.save();
    return res.json(settings);
  } catch (err) {
    console.error('Add cohort error:', err);
    res.status(500).json({ error: 'Failed to add cohort.' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/admin/settings/cohorts/:cohort
// Delete a cohort
// ─────────────────────────────────────────────
router.delete('/settings/cohorts/:cohort', adminAuth, async (req, res) => {
  try {
    const cohort = decodeURIComponent(req.params.cohort);
    const migrateTo = req.query.migrateTo !== undefined ? decodeURIComponent(req.query.migrateTo) : undefined;
    const settings = await Settings.getSingleton();

    // Migrate or clear users who were on this cohort
    const updatePayload = migrateTo
      ? { selectedCohort: migrateTo }
      : { selectedCohort: null };
    const result = await User.updateMany({ selectedCohort: cohort }, { $set: updatePayload });

    // Remove cohort from list
    settings.cohorts = settings.cohorts.filter(c => c !== cohort);
    // Clear active cohort if it was this one
    if (settings.activeCohort === cohort) {
      settings.activeCohort = '';
    }
    await settings.save();

    return res.json({ settings, affectedUsers: result.modifiedCount });
  } catch (err) {
    console.error('Delete cohort error:', err);
    res.status(500).json({ error: 'Failed to delete cohort.' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/settings/active-cohort
// Update active cohort
// ─────────────────────────────────────────────
const activeCohortSchema = Joi.object({
  activeCohort: Joi.string().allow('').optional()
});
router.patch('/settings/active-cohort', adminAuth, validate(activeCohortSchema), async (req, res) => {
  try {
    const { activeCohort } = req.body;
    const settings = await Settings.getSingleton();
    // Allow clearing the active cohort (empty string means no active cohort)
    if (activeCohort && !settings.cohorts.includes(activeCohort)) {
      return res.status(400).json({ error: 'Selected cohort must exist first.' });
    }
    settings.activeCohort = activeCohort || '';
    await settings.save();

    // Auto-assign all users with no date to the new active cohort and un-waitlist them
    if (activeCohort) {
      await User.updateMany(
        { selectedCohort: null },
        { $set: { selectedCohort: activeCohort, isWaitlisted: false } }
      );
    }

    return res.json(settings);
  } catch (err) {
    console.error('Update active cohort error:', err);
    res.status(500).json({ error: 'Failed to update active cohort.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/settings/salespersons
// Add active salesperson
// ─────────────────────────────────────────────
const addSalespersonSchema = Joi.object({
  salesperson: Joi.string().required()
});
router.post('/settings/salespersons', adminAuth, validate(addSalespersonSchema), async (req, res) => {
  try {
    const { salesperson } = req.body;
    const settings = await Settings.getSingleton();
    if (settings.salespersons.includes(salesperson.trim())) {
      return res.status(400).json({ error: 'Salesperson already exists.' });
    }
    settings.salespersons.push(salesperson.trim());
    await settings.save();
    return res.json(settings);
  } catch (err) {
    console.error('Add salesperson error:', err);
    res.status(500).json({ error: 'Failed to add salesperson.' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/admin/settings/salespersons/:name
// Delete salesperson
// ─────────────────────────────────────────────
router.delete('/settings/salespersons/:name', adminAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const settings = await Settings.getSingleton();
    settings.salespersons = settings.salespersons.filter(s => s !== name);
    await settings.save();
    return res.json(settings);
  } catch (err) {
    console.error('Delete salesperson error:', err);
    res.status(500).json({ error: 'Failed to delete salesperson.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/admin/bulk-register
// Bulk registration via JSON array parsed from CSV
// ─────────────────────────────────────────────
const bulkRegisterSchema = Joi.object({
  users: Joi.array().items(Joi.object({
    fullName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    userType: Joi.string().valid('student', 'working').required(),
    collegeName: Joi.string().allow('', null).optional(),
    course: Joi.string().allow('', null).optional(),
    year: Joi.string().allow('', null).optional(),
    domain: Joi.string().allow('', null).optional(),
    organization: Joi.string().allow('', null).optional(),
    heardFrom: Joi.string().allow('', null).optional(),
    referralCode: Joi.string().allow('', null).optional(),
  })).min(1).required()
});

router.post('/bulk-register', adminAuth, validate(bulkRegisterSchema), async (req, res) => {
  try {
    const { users } = req.body;
    const settings = await Settings.getSingleton();
    const cohortToRegister = settings.activeCohort || 'June 13 & 14, 2026';
    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';

    const results = {
      successCount: 0,
      failCount: 0,
      errors: []
    };

    for (const u of users) {
      try {
        const emailLower = u.email.toLowerCase().trim();
        const existing = await User.findOne({ email: emailLower });
        if (existing) {
          results.failCount++;
          results.errors.push({ email: u.email, error: 'User already exists' });
          continue;
        }

        // Resolve referral code
        let mappedReferral = null;
        if (u.referralCode) {
          const match = settings.referralCodes.find(r => r.code === u.referralCode.toLowerCase().trim());
          mappedReferral = match ? match.label : u.referralCode.trim();
        }

        const userData = {
          fullName: u.fullName.trim(),
          email: emailLower,
          phone: u.phone?.trim() || undefined,
          userType: u.userType,
          heardFrom: u.heardFrom?.trim() || 'Admin Bulk Upload',
          referralCode: mappedReferral,
          selectedCohort: cohortToRegister,
          isAdminCreated: true,
          registeredEvents: [{
            eventName: EVENT_NAME,
            paymentStatus: 'pending'
          }]
        };

        if (u.userType === 'student') {
          userData.collegeName = u.collegeName?.trim();
          userData.course = u.course?.trim();
          userData.year = u.year?.trim();
        } else {
          userData.domain = u.domain?.trim();
          userData.organization = u.organization?.trim();
        }

        await User.create(userData);
        results.successCount++;
      } catch (err) {
        console.error(`Bulk upload failed for ${u.email}:`, err);
        results.failCount++;
        results.errors.push({ email: u.email, error: err.message });
      }
    }

    res.locals.auditTarget = 'bulk-registration';
    res.locals.auditDetails = {
      uploaded_count: users.length,
      successCount: results.successCount,
      failCount: results.failCount
    };

    return res.json({
      message: `Bulk registration completed: ${results.successCount} succeeded, ${results.failCount} failed.`,
      ...results
    });
  } catch (err) {
    console.error('Bulk registration main error:', err);
    res.status(500).json({ error: 'Failed to process bulk registration.' });
  }
});
// ─────────────────────────────────────────────
// POST /api/admin/send-certificates
// Generate and send certificates to users (individual or bulk)
// ─────────────────────────────────────────────
router.post('/send-certificates', adminAuth, async (req, res) => {
  try {
    const { userIds, filterPaid, filterType, filterWaitlist, filterReferral, filterHeardFrom, filterCohort, filterFeedback, search } = req.body;
    const { generateCertificate } = require('../utils/certificate');
    const { sendCertificateEmail } = require('../utils/email');

    let targetUsers = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Send to specific selected users
      const mongoose = require('mongoose');
      const validIds = userIds
        .filter(id => id && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (validIds.length > 0) {
        targetUsers = await User.find({ _id: { $in: validIds } });
      }
    } else {
      // Send in bulk based on filters
      const query = {};

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { collegeName: { $regex: search, $options: 'i' } },
          { organization: { $regex: search, $options: 'i' } }
        ];
      }

      if (filterType && filterType !== 'all') query.userType = filterType;

      if (filterWaitlist === 'waitlisted') query.isWaitlisted = true;
      else if (filterWaitlist === 'regular') query.isWaitlisted = { $ne: true };

      if (filterReferral && filterReferral !== 'all') query.referralCode = filterReferral;

      if (filterPaid === 'paid') {
        query['registeredEvents'] = { $elemMatch: { paymentStatus: 'confirmed' } };
      } else if (filterPaid === 'unpaid') {
        query['registeredEvents'] = { $not: { $elemMatch: { paymentStatus: 'confirmed' } } };
      }

      if (filterHeardFrom === 'social media') {
        query.heardFrom = { $regex: '^social\\s*media$', $options: 'i' };
      } else if (filterHeardFrom === 'newspaper') {
        query.heardFrom = { $regex: '^newspaper$', $options: 'i' };
      } else if (filterHeardFrom === 'gkt employee') {
        query.heardFrom = { $regex: 'gkt\\s*employee', $options: 'i' };
      } else if (filterHeardFrom === 'others') {
        query.$and = [
          { heardFrom: { $exists: true } },
          { heardFrom: { $ne: '' } },
          { heardFrom: { $ne: '-' } },
          { heardFrom: { $nin: [/social\s*media/i, /newspaper/i, /gkt\s*employee/i] } }
        ];
      }

      if (filterCohort && filterCohort !== 'all') {
        query.selectedCohort = filterCohort;
      }

      if (filterFeedback === 'completed') {
        query.isFeedbackSubmitted = true;
      } else if (filterFeedback === 'pending') {
        query.isFeedbackSubmitted = { $ne: true };
      }

      // ONLY send to users who haven't received their certificate yet!
      query.isCertificateSent = { $ne: true };

      targetUsers = await User.find(query);
    }

    if (targetUsers.length === 0) {
      return res.status(200).json({ 
        message: 'No new certificates to send (all matching/eligible users have already been sent certificates).',
        count: 0 
      });
    }

    // Process asynchronously in background
    res.json({ 
      message: `Certificate generation and email delivery initiated for ${targetUsers.length} users.`,
      count: targetUsers.length 
    });

    // Run background processing
    (async () => {
      for (const user of targetUsers) {
        try {
          // Generate certificate image
          const { buffer } = await generateCertificate(user.fullName, user._id.toString());
          
          // Save path to user document and mark as sent
          user.certificatePath = `/uploads/certificates/${user._id.toString()}.jpg`;
          user.isCertificateSent = true;
          await user.save();

          // Send Email
          await sendCertificateEmail(user, buffer);
          console.log(`Certificate successfully sent to ${user.email}`);
        } catch (singleErr) {
          console.error(`Failed to generate/send certificate for ${user.email}:`, singleErr);
        }
      }
    })().catch(console.error);

  } catch (err) {
    console.error('Send certificates route error:', err);
    res.status(500).json({ error: 'Failed to initiate certificate sending.' });
  }
});

module.exports = router;

