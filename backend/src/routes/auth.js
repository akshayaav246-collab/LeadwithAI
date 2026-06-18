const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const User = require('../models/User');
const Settings = require('../models/Settings');
const Otp = require('../models/Otp');

const { sendRegistrationEmail, sendOtpEmail, sendVerificationOtpEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');
const Joi = require('joi');
const validate = require('../middleware/validate');

const router = express.Router();



// ─────────────────────────────────────────────
// POST /api/auth/send-register-otp
// ─────────────────────────────────────────────
const sendRegisterOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  userType: Joi.string().valid('student', 'working').optional()
});

// GET /api/auth/check-email (check if user exists)
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required.' });
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    return res.json({ exists: !!existing });
  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ error: 'Failed to check email.' });
  }
});

router.post('/send-register-otp', validate(sendRegisterOtpSchema), async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'User already exists. Please login instead.' });
    }

    const otp = generateOtp();
    await Otp.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        otp,
        expiry: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
        isVerified: false
      },
      { upsert: true, new: true }
    );

    await sendVerificationOtpEmail(email.toLowerCase(), otp);
    return res.json({ message: 'Registration OTP sent successfully.' });
  } catch (err) {
    console.error('Send register OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-register-otp
// ─────────────────────────────────────────────
const verifyRegisterOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

router.post('/verify-register-otp', validate(verifyRegisterOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const record = await Otp.findOne({ email: email.toLowerCase() });
    if (!record || record.otp !== otp || new Date() > record.expiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    record.isVerified = true;
    record.expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins to complete registration
    await record.save();

    return res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Verify register OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `id-${unique}${path.extname(file.originalname)}`);
  },
});
const ALLOWED_MIME = ['application/pdf'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const extAllowed = /\.(pdf)$/i.test(path.extname(file.originalname));
    const mimeAllowed = ALLOWED_MIME.includes(file.mimetype);
    if (extAllowed && mimeAllowed) cb(null, true);
    else cb(new Error('Only PDF files containing both sides of the ID card are allowed (max 5MB)'));
  },
});

// Helper: generate JWT
function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Helper: generate 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// Helper: fetch and format user with their group members
async function getFormattedUser(userId) {
  const user = await User.findById(userId).select('-otpHash -otpExpiry');
  if (!user) return null;
  const groupMembers = await User.find({ groupLeaderId: user._id }).select('-otpHash -otpExpiry');
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    userType: user.userType,
    collegeName: user.collegeName,
    course: user.course,
    year: user.year,
    domain: user.domain,
    organization: user.organization,
    heardFrom: user.heardFrom,
    selectedCohort: user.selectedCohort,
    salesperson: user.salesperson || null,
    referralCode: user.referralCode || null,
    isAdminCreated: user.isAdminCreated,
    isWaitlisted: user.isWaitlisted,
    registeredEvents: user.registeredEvents,
    isFeedbackSubmitted: user.isFeedbackSubmitted,
    feedback: user.feedback,
    isProfileComplete: user.isProfileComplete,
    country: user.country,
    createdAt: user.createdAt,
    groupMembers: groupMembers.map(m => ({
      id: m._id,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      userType: m.userType,
      collegeName: m.collegeName,
      course: m.course,
      year: m.year,
      domain: m.domain,
      organization: m.organization,
      selectedCohort: m.selectedCohort,
      registeredEvents: m.registeredEvents,
      isProfileComplete: m.isProfileComplete
    }))
  };
}


// ─────────────────────────────────────────────
// POST /api/auth/parse-id
// ─────────────────────────────────────────────
router.post('/parse-id', upload.single('idCard'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No ID card image provided.' });
  }

  const filePath = req.file.path;
  const studentEmail = (req.body.email || '').toLowerCase().trim();

  // ── Year helpers ──────────────────────────────────────────────
  function calcYearFromRange(startYear, endYear) {
    const currentYear = new Date().getFullYear();
    const elapsed = currentYear - startYear;
    const yearNum = Math.min(Math.max(elapsed, 1), endYear - startYear);
    const suffix = ['1st', '2nd', '3rd', '4th', '5th'];
    return (suffix[yearNum - 1] || yearNum + 'th') + ' Year';
  }

  function parseYearFromRange(rawText) {
    if (!rawText) return '';
    const rangeMatch = rawText.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end   = parseInt(rangeMatch[2]);
      if (end > start && (end - start) <= 6) return calcYearFromRange(start, end);
    }
    const explicitMatch = rawText.match(/(1st|2nd|3rd|4th|5th|I{1,4}|VI?I{0,2})\s*(Year|Yr)/i);
    if (explicitMatch) return explicitMatch[0];
    return '';
  }

  function getEndYear(academicYearRange) {
    if (!academicYearRange) return null;
    const m = academicYearRange.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    return m ? parseInt(m[2]) : null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');
    const currentYear = new Date().getFullYear();

    // ── STEP 1: Gemini — extract + forensic checks ──────────────────────
    const prompt = `You are an AI assistant designed to extract information and analyze images of ID cards. Your ONLY job is to extract the following information from the image and return a JSON object. Do not make final approval or rejection decisions.

1.  Is it an educational institution ID card? (is_educational_id)
    *   True if it's a student/staff ID for a college, university, institute, or school.
    *   False for driver's licenses, Aadhaar, PAN, gym memberships, corporate badges, or random photos.
2.  Does it appear physically real? (is_physically_real)
    *   True if there are physical signs: glare, shadow, background surface, lamination sheen, lanyard hole, slight wear, perspective distortion, imperfect printing.
    *   False if it looks like a digital screenshot, a perfectly flat graphic, a Canva mockup, has phone UI elements, no background context, or looks completely AI generated.
3.  Is it a legitimate institution? (is_legitimate_institution)
    *   Extract the institution name. If the name sounds like a real, plausible educational institution, set this to true. If it sounds fake or nonsensical, set to false.
4.  Extract Institution Name (institution_name)
    *   The exact name of the college or university printed on the card. Null if not found.
5.  Extract Expiry Date (expiry_date)
    *   Any explicit expiry date like "Valid until Dec 2024". Null if not found.
6.  Extract Batch Validity (batch_validity)
    *   Any academic year range like "2020-2024" or "Batch: 2021". Null if not found.
7.  Confidence Score (confidence_score)
    *   "high" if the card is extremely clear, obviously physical, and all text is readable.
    *   "medium" if it's somewhat blurry, or lacks strong physical context but still looks plausible.
    *   "low" if you are unsure, it's very blurry, or looks highly suspicious.

Return ONLY raw JSON, no markdown, no explanation outside the JSON. The JSON schema must strictly match:
{
  "is_educational_id": boolean,
  "is_physically_real": boolean,
  "is_legitimate_institution": boolean,
  "institution_name": "string or null",
  "expiry_date": "string or null",
  "batch_validity": "string or null",
  "confidence_score": "high | medium | low"
}`;

    let geminiResult = null;

    const REJECTION_MESSAGE = 'The uploaded ID could not be verified as a valid educational institution ID. Please upload a clear image of an original physical ID card.';

    // Safe fallback response — always returns valid JSON so browser never sees ERR_FAILED
    const REVIEW_RESPONSE = {
      is_id_card: false,
      is_valid_college: false,
      college: null,
      verdict: 'REVIEW',
      rejection_reason: null,
      source: 'gemini',
    };

    try {
      // Race Gemini against a 20-second timeout.
      // If Gemini hangs, the timeout wins and we skip validation silently.
      const geminiTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 20000)
      );

      const geminiCall = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          { inlineData: { data: base64Image, mimeType: req.file.mimetype } },
        ],
      });

      const response = await Promise.race([geminiCall, geminiTimeout]);
      let rawText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      geminiResult = JSON.parse(rawText);
    } catch (geminiErr) {
      const msg = geminiErr.message || '';
      console.warn('Gemini ID scan failed/timed out:', msg);

      const isTraffic = /429|exhausted|quota|limit|traffic|503|504|unavailable/i.test(msg);
      const isTimeout = msg === 'GEMINI_TIMEOUT';

      if (isTraffic) {
        console.warn('Gemini high traffic detected — returning REVIEW to bypass validation silently');
      } else if (isTimeout) {
        console.warn('Gemini timed out after 20s — returning REVIEW to avoid ERR_FAILED');
      }
      return res.json(REVIEW_RESPONSE);
    }

    // ── STEP 2: Backend Logic Validation ───────────────────────────────────
    let isExpired = false;

    // Check expiry
    if (geminiResult.expiry_date) {
      // Very basic heuristic check for expiry date
      const matchYear = geminiResult.expiry_date.match(/\b(20\d{2})\b/);
      if (matchYear && parseInt(matchYear[1]) < currentYear) {
        isExpired = true;
      }
    }
    
    if (geminiResult.batch_validity) {
      const matchRange = geminiResult.batch_validity.match(/\b(20\d{2})\s*[-–]\s*(20\d{2})\b/);
      if (matchRange && parseInt(matchRange[2]) < currentYear) {
        isExpired = true;
      }
    }

    const isValid = 
      geminiResult.is_educational_id === true &&
      geminiResult.is_physically_real === true &&
      geminiResult.is_legitimate_institution === true &&
      geminiResult.confidence_score !== 'low' &&
      !isExpired;

    let verdict = isValid ? 'APPROVED' : 'REJECTED';
    let rejection_reason = isValid ? null : REJECTION_MESSAGE;

    return res.json({
      is_id_card: geminiResult.is_educational_id,
      is_valid_college: geminiResult.is_legitimate_institution,
      college: geminiResult.institution_name || null,
      verdict,
      rejection_reason,
      source: 'gemini',
    });

  } catch (err) {
    // Outer catch — should never reach here now, but if it does return REVIEW not 500
    console.error('Parse ID unexpected error:', err);
    return res.json({
      is_id_card: false,
      is_valid_college: false,
      college: null,
      verdict: 'REVIEW',
      rejection_reason: null,
      source: 'gemini',
    });
  } finally {
    try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
const registerSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  userType: Joi.string().valid('student', 'working').required(),
  collegeName: Joi.string().allow('', null),
  course: Joi.string().allow('', null),
  year: Joi.string().allow('', null),
  domain: Joi.string().allow('', null),
  organization: Joi.string().allow('', null),
  heardFrom: Joi.string().required(),
  salesperson: Joi.string().allow('', null).optional(),
  referralCode: Joi.string().allow('', null),
  country: Joi.string().valid('India', 'Nepal').default('India').optional(),
  selectedCohort: Joi.string().allow('', null).optional(),
  groupMembers: Joi.string().allow('', null).optional()
});

router.post('/register', upload.single('idCard'), validate(registerSchema), async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      userType,
      collegeName,
      course,
      year,
      domain,
      organization,
      heardFrom,
      referralCode,
      country,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !userType || !heardFrom) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!['student', 'working'].includes(userType)) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Invalid user type.' });
    }

    const otpRecord = await Otp.findOne({ email: email.toLowerCase(), isVerified: true });
    if (!otpRecord) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({ error: 'Email must be verified before registration.' });
    }

    // Parse group members if any
    let groupMembers = [];
    if (req.body.groupMembers) {
      try {
        groupMembers = JSON.parse(req.body.groupMembers);
      } catch (e) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Invalid groupMembers format.' });
      }
    }

    if (groupMembers.length > 9) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'You can only add up to 9 group members.' });
    }

    const seenEmails = new Set([email.toLowerCase().trim()]);
    for (let i = 0; i < groupMembers.length; i++) {
      const m = groupMembers[i];
      if (!m.fullName || !m.fullName.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: `Member ${i + 1}: Name is required.` });
      }
      if (!m.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: `Member ${i + 1}: A valid email is required.` });
      }
      const memberEmail = m.email.toLowerCase().trim();
      if (seenEmails.has(memberEmail)) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: `Member ${i + 1}: Duplicate email (${m.email}) is not allowed.` });
      }
      seenEmails.add(memberEmail);

      if (!m.phone || m.phone.trim().length < 7) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: `Member ${i + 1}: A valid phone number is required.` });
      }
    }

    // Check duplicate emails against DB
    const allEmails = Array.from(seenEmails);
    const existingUsers = await User.find({ email: { $in: allEmails } });
    if (existingUsers.length > 0) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      const duplicateEmails = existingUsers.map(u => u.email).join(', ');
      return res.status(409).json({ error: `The following email(s) are already registered: ${duplicateEmails}` });
    }

    const settings = await Settings.getSingleton();

    // Salesperson tracking
    let selectedSalesperson = null;
    if (heardFrom === 'GKT Employee') {
      if (!req.body.salesperson || !req.body.salesperson.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Salesperson is required when referral is GKT Employee.' });
      }
      const activeSalespersons = settings.referralCodes
        ? settings.referralCodes.filter(r => r.isActive).map(r => r.label)
        : [];
      if (!activeSalespersons.includes(req.body.salesperson.trim())) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Selected salesperson is invalid.' });
      }
      selectedSalesperson = req.body.salesperson.trim();
    }

    // Organization validation for working professionals
    if (userType === 'working') {
      if (!organization || !organization.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Organization is required for working professionals.' });
      }
    }

    // Waitlist Logic: Use the dynamic registrationCap from Settings
    const userCount = await User.countDocuments();
    const isWaitlisted = userCount >= (settings.registrationCap || 1000);

    // Referral code resolution:
    // 1. If came via referral link → use that code
    // 2. If selected GKT Employee + salesperson → find matching referral code and assign it
    let mappedReferral = null;
    if (referralCode) {
      const activeReferrals = settings.referralCodes.filter(r => r.isActive);
      const match = activeReferrals.find(r => r.code === referralCode.toLowerCase());
      mappedReferral = match ? match.label : referralCode;
    } else if (heardFrom === 'GKT Employee' && selectedSalesperson) {
      // Auto-assign: find the referral code whose label matches the selected salesperson
      const activeReferrals = settings.referralCodes ? settings.referralCodes.filter(r => r.isActive) : [];
      const matchedRef = activeReferrals.find(r => r.label === selectedSalesperson);
      if (matchedRef) {
        mappedReferral = matchedRef.label; // store as label (e.g. "gkt01 - Chetana N")
      }
    }

    const cohortToRegister = settings.activeCohort || 'June 13 & 14, 2026';

    // Build user object
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      userType,
      heardFrom: heardFrom.trim(),
      referralCode: mappedReferral,
      selectedCohort: cohortToRegister,
      salesperson: selectedSalesperson,
      isWaitlisted,
      country: country || 'India',
      registeredEvents: [{
        eventName: 'Lead with AI: Adopt, Implement and Transform',
        paymentStatus: 'pending'
      }]
    };

    if (userType === 'student') {
      userData.collegeName = collegeName?.trim();
      userData.course = course?.trim();
      userData.year = year?.trim();
      if (req.file) {
        userData.idCardPath = req.file.filename;
      }
    } else {
      userData.domain = domain?.trim();
      userData.organization = organization?.trim();
    }

    const user = await User.create(userData);

    // Create group members if any
    const createdMembers = [];
    if (groupMembers.length > 0) {
      for (const m of groupMembers) {
        const memberData = {
          fullName: m.fullName.trim(),
          email: m.email.toLowerCase().trim(),
          phone: m.phone.trim(),
          userType: userType,
          selectedCohort: cohortToRegister,
          groupLeaderId: user._id,
          heardFrom: user.heardFrom,
          referralCode: user.referralCode,
          salesperson: user.salesperson || null,
          country: country || 'India',
          registeredEvents: [{
            eventName: 'Lead with AI: Adopt, Implement and Transform',
            paymentStatus: 'pending'
          }]
        };
        if (userType === 'working') {
          memberData.domain = domain?.trim() || 'General';
          memberData.organization = organization?.trim();
        }
        const newMember = await User.create(memberData);
        createdMembers.push(newMember);
      }
    }

    // Delete verified OTP record only after all user creations successfully complete
    await Otp.deleteOne({ email: email.toLowerCase() });

    // Send confirmation email (non-blocking)
    sendRegistrationEmail(user).catch((err) => console.error('Email error:', err));
    for (const member of createdMembers) {
      sendRegistrationEmail(member).catch((err) => console.error('Email error:', err));
    }

    const token = signToken(user._id);
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        userType: user.userType,
        collegeName: user.collegeName,
        course: user.course,
        year: user.year,
        domain: user.domain,
        organization: user.organization,
        heardFrom: user.heardFrom,
        selectedCohort: user.selectedCohort,
        isWaitlisted: user.isWaitlisted,
        country: user.country,
        registeredEvents: user.registeredEvents,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/send-otp
// ─────────────────────────────────────────────
const sendOtpSchema = Joi.object({
  email: Joi.string().email().required()
});

router.post('/send-otp', validate(sendOtpSchema), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Account does not exist, please register.' });
    }

    const otp = generateOtp();
    await user.setOtp(otp);
    await user.save();

    await sendOtpEmail(user.email, otp, user.fullName);

    return res.json({ message: 'OTP sent successfully. Check your email.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────
const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Block login for deactivated accounts
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
    }

    const valid = await user.verifyOtp(otp);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // Clear OTP after successful use
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user._id);
    const formattedUser = await getFormattedUser(user._id);
    return res.json({
      message: 'Login successful',
      token,
      user: formattedUser,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const formattedUser = await getFormattedUser(req.userId);
    if (!formattedUser) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      user: formattedUser,
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/auth/update-working-details (protected)
// ─────────────────────────────────────────────
router.patch('/update-working-details', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.userType !== 'working') {
      return res.status(400).json({ error: 'Only working professional accounts can update domain/organization.' });
    }

    const { domain, organization } = req.body;
    if (!domain || !domain.trim()) {
      return res.status(400).json({ error: 'Domain is required.' });
    }
    if (!organization || !organization.trim()) {
      return res.status(400).json({ error: 'Organization is required.' });
    }

    user.domain = domain.trim();
    user.organization = organization.trim();
    await user.save();

    const formattedUser = await getFormattedUser(user._id);

    return res.json({
      message: 'Working details updated successfully',
      user: formattedUser,
    });
  } catch (err) {
    console.error('Update working details error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/auth/complete-profile (protected)
// ─────────────────────────────────────────────
router.patch('/complete-profile', authMiddleware, upload.single('idCard'), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(404).json({ error: 'User not found.' });
    }

    const {
      phone,
      userType,
      collegeName,
      course,
      year,
      domain,
      organization,
      heardFrom,
      heardFromOther,
      selectedCohort,
      country,
      salesperson,
    } = req.body;

    const isGroupMember = !!user.groupLeaderId;

    // Validate required fields
    if (!phone || !userType || (!isGroupMember && !heardFrom) || !selectedCohort) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Missing required fields (phone, userType, heardFrom, selectedCohort).' });
    }

    const settings = await Settings.getSingleton();

    // Salesperson tracking
    let selectedSalesperson = null;
    if (!isGroupMember && heardFrom === 'GKT Employee') {
      if (!salesperson || !salesperson.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Salesperson is required when referral is GKT Employee.' });
      }
      const activeSalespersons = settings.referralCodes
        ? settings.referralCodes.filter(r => r.isActive).map(r => r.label)
        : [];
      if (!activeSalespersons.includes(salesperson.trim())) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Selected salesperson is invalid.' });
      }
      selectedSalesperson = salesperson.trim();
    }

    const validCohorts = settings.cohorts || ['June 13 & 14, 2026'];
    if (!validCohorts.includes(selectedCohort)) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Invalid cohort selected.' });
    }

    // Cohort availability validation
    const { getAvailableCohorts } = require('../utils/cohorts');
    const available = await getAvailableCohorts();
    const isSameCohort = user.selectedCohort === selectedCohort;
    if (!isSameCohort && !available.includes(selectedCohort)) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: `Selected date (${selectedCohort}) is no longer available.` });
    }

    const hasInvalidPhoneChars = /[^\d+\s()-]/.test(phone);
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (hasInvalidPhoneChars || !phoneRegex.test(cleanedPhone)) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Please enter a valid phone number (e.g. +91 98765 43210).' });
    }

    // Enforce lock on userType if it was set by admin
    if (user.userType && user.userType !== userType) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: `Account type is pre-set to ${user.userType} and cannot be modified.` });
    }

    // Conditional details validation
    if (userType === 'student') {
      if (!collegeName?.trim() || !course?.trim() || !year?.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Missing student details (college, course, year).' });
      }

      if (!req.file && !user.idCardPath) {
        return res.status(400).json({ error: 'College ID card PDF is required.' });
      }
    } else if (userType === 'working') {
      if (!domain?.trim() || !organization?.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'Domain and Organization are required for working professionals.' });
      }
    } else {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Invalid user type.' });
    }

    // Resolve heardFrom
    let finalHeardFrom = user.heardFrom || '';
    if (!isGroupMember && heardFrom) {
      finalHeardFrom = heardFrom.trim();
      if (finalHeardFrom === 'Others') {
        if (!heardFromOther?.trim()) {
          if (req.file) await fs.unlink(req.file.path).catch(() => {});
          return res.status(400).json({ error: 'Please specify how you heard about us.' });
        }
        finalHeardFrom = heardFromOther.trim();
      }
    }

    // Update user properties
    user.phone = phone.trim();
    user.userType = userType;
    user.selectedCohort = selectedCohort;
    
    if (!isGroupMember) {
      user.heardFrom = finalHeardFrom;
      user.salesperson = selectedSalesperson;

      // Auto-assign referral code when user picks GKT Employee + salesperson (no existing referral)
      if (!user.referralCode && finalHeardFrom === 'GKT Employee' && selectedSalesperson) {
        const activeReferrals = settings.referralCodes ? settings.referralCodes.filter(r => r.isActive) : [];
        const matchedRef = activeReferrals.find(r => r.label === selectedSalesperson);
        if (matchedRef) {
          user.referralCode = matchedRef.label;
        }
      }
    }
    if (country) {
      user.country = country;
    }

    if (userType === 'student') {
      user.collegeName = collegeName.trim();
      user.course = course.trim();
      user.year = year.trim();
      if (req.file) {
        user.idCardPath = req.file.filename;
      }
      user.domain = undefined;
      user.organization = undefined;
    } else {
      user.domain = domain.trim();
      user.organization = organization.trim();
      user.collegeName = undefined;
      user.course = undefined;
      user.year = undefined;
    }
    
    user.isProfileSubmittedByMember = true;

    await user.save();

    const formattedUser = await getFormattedUser(user._id);
    return res.json({
      message: 'Profile completed successfully.',
      user: formattedUser
    });
  } catch (err) {
    console.error('PATCH /complete-profile error:', err);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to complete profile.' });
  }
});

// POST /api/auth/change-cohort (protected)
router.post('/change-cohort', authMiddleware, async (req, res) => {
  try {
    const { cohort } = req.body;
    if (!cohort) {
      return res.status(400).json({ error: 'Cohort is required.' });
    }

    const settings = await Settings.getSingleton();
    const validCohorts = settings.cohorts || ['June 13 & 14, 2026'];
    if (!validCohorts.includes(cohort)) {
      return res.status(400).json({ error: 'Invalid cohort selected.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
    const eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME);

    // Update cohort
    user.selectedCohort = cohort;

    // Automatically re-register for Zoom webinar if they are already confirmed for the event
    if (eventEntry && eventEntry.paymentStatus === 'confirmed') {
      try {
        const { registerForWebinar } = require('../utils/zoom');
        const [firstName, ...lastNameParts] = user.fullName.split(' ');
        const joinUrl = await registerForWebinar(user.email, firstName, lastNameParts.join(' '), cohort);
        eventEntry.zoomJoinUrl = joinUrl;
        eventEntry.zoomRegistrationStatus = 'success';
      } catch (zoomErr) {
        console.error('Zoom re-registration failed during cohort update:', zoomErr);
        eventEntry.zoomRegistrationStatus = 'failed';
      }
    }

    await user.save();

    const formattedUser = await getFormattedUser(user._id);
    return res.json({
      message: 'Cohort updated successfully.',
      user: formattedUser
    });
  } catch (err) {
    console.error('Change cohort error:', err);
    res.status(500).json({ error: 'Failed to update cohort date.' });
  }
});

// ─── SUBMIT FEEDBACK ───────────────────────────────────────────
const feedbackSchema = Joi.object({
  feedback: Joi.array().items(
    Joi.object({
      session: Joi.string().required(),
      rating: Joi.string().allow('', null).optional(),
      text: Joi.string().allow('').optional()
    })
  ).min(1).required()
});

router.post('/feedback', authMiddleware, validate(feedbackSchema), async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!feedback || !Array.isArray(feedback) || feedback.length === 0) {
      return res.status(400).json({ error: 'Valid feedback array is required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Validate that there is a confirmed event before accepting feedback
    const hasConfirmedPayment = user.registeredEvents.some(e => e.paymentStatus === 'confirmed');
    if (!hasConfirmedPayment) {
      return res.status(403).json({ error: 'You must have a confirmed registration to submit feedback.' });
    }

    user.feedback = feedback;
    user.isFeedbackSubmitted = true;
    await user.save();

    return res.json({ message: 'Feedback submitted successfully.' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Server error while submitting feedback.' });
  }
});

// ─── PUBLIC CERTIFICATE VERIFICATION ───────────────────────────
router.get('/certificate/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('fullName registeredEvents isFeedbackSubmitted');
    if (!user) return res.status(404).json({ error: 'Certificate not found.' });

    const confirmedEvent = user.registeredEvents.find(e => e.paymentStatus === 'confirmed');
    if (!confirmedEvent) {
      return res.status(403).json({ error: 'No confirmed registration found for this user.' });
    }

    if (!user.isFeedbackSubmitted) {
      return res.status(403).json({ error: 'Certificate not available yet.' });
    }

    return res.json({
      fullName: user.fullName,
      eventName: confirmedEvent.eventName,
      issueDate: confirmedEvent.registeredAt // Or some other date
    });
  } catch (err) {
    console.error('Certificate fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/add-group-member (protected)
// ─────────────────────────────────────────────
const addGroupMemberSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  collegeName: Joi.string().allow('', null).optional(),
  course: Joi.string().allow('', null).optional(),
  year: Joi.string().allow('', null).optional(),
  domain: Joi.string().allow('', null).optional(),
  organization: Joi.string().allow('', null).optional()
});

router.post('/add-group-member', authMiddleware, upload.single('idCard'), async (req, res) => {
  try {
    const { error, value } = addGroupMemberSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      const messages = error.details.map(i => i.message);
      return res.status(400).json({ error: 'Validation Error', details: messages });
    }

    const leader = await User.findById(req.userId);
    if (!leader) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Leader user not found.' });
    }

    // Check group size limit (max 9 members added by one leader)
    const memberCount = await User.countDocuments({ groupLeaderId: leader._id });
    if (memberCount >= 9) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'You can only add up to 9 group members.' });
    }

    const { fullName, email, phone, collegeName, course, year, domain, organization } = value;
    const memberEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await User.findOne({ email: memberEmail });
    if (existing) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(409).json({ error: `A user with email ${email} is already registered.` });
    }

    // Determine target cohort: use leader's cohort
    const cohortToRegister = leader.selectedCohort || (await Settings.getSingleton()).activeCohort;

    // Validate phone number
    const hasInvalidPhoneChars = /[^\d+\s()-]/.test(phone);
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (hasInvalidPhoneChars || !phoneRegex.test(cleanedPhone)) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    const userData = {
      fullName: fullName.trim(),
      email: memberEmail,
      phone: phone.trim(),
      userType: leader.userType,
      selectedCohort: cohortToRegister,
      groupLeaderId: leader._id,
      heardFrom: leader.heardFrom,
      referralCode: leader.referralCode || null,
      salesperson: leader.salesperson || null,
      isWaitlisted: leader.isWaitlisted || false,
      country: leader.country || 'India',
      registeredEvents: [{
        eventName: 'Lead with AI: Adopt, Implement and Transform',
        paymentStatus: 'pending'
      }]
    };

    if (leader.userType === 'student') {
      if (!collegeName?.trim() || !course?.trim() || !year?.trim()) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ error: 'College, course, and year are required for student members.' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'College ID card PDF is required for student members.' });
      }
      userData.collegeName = collegeName.trim();
      userData.course = course.trim();
      userData.year = year.trim();
      userData.idCardPath = req.file.filename;
    } else {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      if (!organization?.trim()) {
        return res.status(400).json({ error: 'Organization is required for working professional members.' });
      }
      userData.domain = domain?.trim() || 'General';
      userData.organization = organization.trim();
    }

    const newMember = await User.create(userData);

    // Send confirmation email
    sendRegistrationEmail(newMember).catch(err => console.error('Email error:', err));

    return res.status(201).json({
      message: 'Group member added successfully.',
      member: {
        id: newMember._id,
        fullName: newMember.fullName,
        email: newMember.email,
        phone: newMember.phone,
        userType: newMember.userType,
        collegeName: newMember.collegeName,
        course: newMember.course,
        year: newMember.year,
        domain: newMember.domain,
        organization: newMember.organization,
        selectedCohort: newMember.selectedCohort,
        registeredEvents: newMember.registeredEvents,
        idCardPath: newMember.idCardPath,
      }
    });
  } catch (err) {
    console.error('Add group member error:', err);
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
