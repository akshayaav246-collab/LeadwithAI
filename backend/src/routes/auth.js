const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const User = require('../models/User');
const CollegeDomain = require('../models/CollegeDomain');
const { sendRegistrationEmail, sendOtpEmail, sendVerificationOtpEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// In-memory stores for registration email verification
const registerOtps = new Map();
const verifiedEmails = new Set();

// ─────────────────────────────────────────────
// COLLEGE NAME NORMALISATION & XLSX CACHE
// ─────────────────────────────────────────────
let cachedCollegeSet = null;

/**
 * Strips dots, lowercases, collapses whitespace.
 * "K.S.R. College of Engineering" → "ksr college of engineering"
 */
function normalizeCollegeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\./g, '')       // remove dots
    .replace(/[''`]/g, '')    // remove apostrophes
    .replace(/\s+/g, ' ')    // collapse spaces
    .trim();
}

async function getCollegeSet() {
  if (cachedCollegeSet) return cachedCollegeSet;
  try {
    const xlsxPath = path.join(__dirname, '../../../frontend/public/colleges.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(xlsxPath);
    const sheet = workbook.worksheets[0];
    const names = new Set();
    sheet.eachRow((row) => {
      const val = row.getCell(1).value;
      if (val) names.add(normalizeCollegeName(String(val)));
    });
    cachedCollegeSet = names;
    console.log(`[CollegeSet] Loaded ${names.size} colleges from xlsx`);
    return names;
  } catch (err) {
    console.warn('[CollegeSet] Could not load colleges.xlsx:', err.message);
    cachedCollegeSet = new Set();
    return cachedCollegeSet;
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/send-register-otp
// ─────────────────────────────────────────────
router.post('/send-register-otp', async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    // ── Domain restriction: students must use official college email ──
    if (userType === 'student') {
      const emailLower = email.toLowerCase();
      const validDomains = ['.ac.in', '.edu.in', '.edu'];
      const hasValidDomain = validDomains.some(d => emailLower.endsWith(d));
      if (!hasValidDomain) {
        return res.status(400).json({
          error: 'Please use your official college email address (.ac.in or .edu.in only)'
        });
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'User already exists. Please login instead.' });
    }

    const otp = generateOtp();
    registerOtps.set(email.toLowerCase(), {
      otp,
      expiry: Date.now() + 10 * 60 * 1000 // 10 mins
    });

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
router.post('/verify-register-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

  const record = registerOtps.get(email.toLowerCase());
  if (!record || record.otp !== otp || Date.now() > record.expiry) {
    return res.status(400).json({ error: 'Invalid or expired OTP.' });
  }

  registerOtps.delete(email.toLowerCase());
  verifiedEmails.add(email.toLowerCase());
  return res.json({ message: 'Email verified successfully.' });
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
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const extAllowed = /\.(jpeg|jpg|png|pdf)$/i.test(path.extname(file.originalname));
    const mimeAllowed = ALLOWED_MIME.includes(file.mimetype);
    if (extAllowed && mimeAllowed) cb(null, true);
    else cb(new Error('Only JPEG, PNG, PDF files are allowed'));
  },
});

// Helper: generate JWT
function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// Helper: generate 6-digit OTP
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
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

    // ── STEP 1: Gemini — extract + 3 checks ──────────────────────
    const prompt = `You are a strict ID card verification assistant. Carefully analyze this image (it may show one or both sides of a physical ID card, including PDF scans of both sides).

TASK 1 — Is it a genuine physical printed institutional ID card?
Accept: printed college/university/institute ID cards (front or back), PDF scans of both sides.
Reject if it is: a screenshot of any kind, handwritten paper or note, random photograph of a person, digitally created or typed document, or anything that is NOT a printed ID card.

TASK 2 — If it IS a valid ID card, extract:
- college: Full institution name exactly as printed (header, logo label, or watermark)
- course: Full degree and branch (e.g., "B.Tech CSE", "B.E.(ECE)", "MBA", "MCA", "B.Sc CS")
- academicYearRange: Enrollment period exactly as printed (e.g., "2022-2026", "2023 - 2025")

TASK 3 — Is it a CURRENT student (not an alumnus)?
- Current year is ${currentYear}
- Extract the end year from academicYearRange
- end year >= ${currentYear} → is_current_student: true
- end year < ${currentYear} OR no year range found → is_current_student: false

TASK 4 — Is it a STUDENT card, not staff/faculty?
- Card shows a recognized degree or course → is_student_not_staff: true
- Card explicitly shows: Faculty, Professor, Lecturer, Staff, Admin, Employee → is_student_not_staff: false
- Course present but no staff role label → is_student_not_staff: true

Return ONLY raw JSON, no markdown, no code fences:
{
  "is_id_card": true or false,
  "is_current_student": true or false,
  "is_student_not_staff": true or false,
  "college": "string or null",
  "course": "string or null",
  "academicYearRange": "string or null",
  "confidence": "high or medium or low"
}

If a field cannot be determined, use null.`;

    let geminiResult = null;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          { inlineData: { data: base64Image, mimeType: req.file.mimetype } },
        ],
      });
      let rawText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      geminiResult = JSON.parse(rawText);
    } catch (geminiErr) {
      console.warn('Gemini ID scan failed:', geminiErr.message);
      return res.json({
        is_id_card: false,
        is_valid_college: false,
        is_current_student: false,
        is_student_not_staff: false,
        college: null, course: null, academicYearRange: null, year_of_study: null,
        confidence: 'low',
        verdict: 'REVIEW',
        rejection_reason: 'Please fill in your college details manually below. Your registration will be reviewed by our team.',
        source: 'gemini',
      });
    }

    // ── STEP 2: Early reject if not a valid ID card ──────────────
    if (!geminiResult.is_id_card) {
      return res.json({
        is_id_card: false,
        is_valid_college: false,
        is_current_student: false,
        is_student_not_staff: false,
        college: null, course: null, academicYearRange: null, year_of_study: null,
        confidence: geminiResult.confidence || 'high',
        verdict: 'REJECTED',
        rejection_reason: 'The uploaded image does not appear to be a genuine printed college ID card. Please upload a clear photo or scan of your physical ID card.',
        source: 'gemini',
      });
    }

    // ── STEP 3: Validate college against xlsx + Gemini fallback ──
    const collegeSet = await getCollegeSet();
    const normalizedExtracted = normalizeCollegeName(geminiResult.college || '');
    let isValidCollege = normalizedExtracted ? collegeSet.has(normalizedExtracted) : false;

    if (!isValidCollege && geminiResult.college) {
      // Second Gemini call: ask if it's a recognised Indian institution
      try {
        const checkResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [`Is "${geminiResult.college}" a recognised college, university, or educational institution in India? Reply with ONLY a raw JSON object: {"recognised": true or false, "reason": "brief reason"}`],
        });
        let checkRaw = checkResponse.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        const checkParsed = JSON.parse(checkRaw);
        isValidCollege = checkParsed.recognised === true;
      } catch (checkErr) {
        console.warn('College recognition check failed:', checkErr.message);
        isValidCollege = false;
      }
    }

    // ── STEP 4: Check end year for current student ───────────────
    const endYear = getEndYear(geminiResult.academicYearRange);
    const isCurrentStudent = geminiResult.is_current_student === true && endYear !== null && endYear >= currentYear;

    // ── STEP 5: Build verdict ────────────────────────────────────
    const checks = {
      is_id_card:          true, // already passed step 2
      is_valid_college:    isValidCollege,
      is_current_student:  isCurrentStudent,
      is_student_not_staff: geminiResult.is_student_not_staff === true,
    };

    let verdict = 'APPROVED';
    let rejection_reason = null;

    if (!checks.is_valid_college) {
      verdict = 'REJECTED';
      rejection_reason = `"${geminiResult.college || 'The institution shown'}" could not be verified as a recognised Indian college or university.`;
    } else if (!checks.is_current_student) {
      verdict = 'REJECTED';
      rejection_reason = endYear && endYear < currentYear
        ? `Your academic year ended in ${endYear}. This portal is for current students only, not alumni.`
        : 'Could not confirm you are a current student. Please ensure the academic year range is visible on your ID card.';
    } else if (!checks.is_student_not_staff) {
      verdict = 'REJECTED';
      rejection_reason = 'The ID card appears to belong to a faculty or staff member, not a student.';
    }

    const year_of_study = parseYearFromRange(geminiResult.academicYearRange || '');

    // ── STEP 6: Save CollegeDomain on APPROVED ───────────────────
    if (verdict === 'APPROVED' && studentEmail && geminiResult.college) {
      try {
        const atIndex = studentEmail.lastIndexOf('@');
        const emailDomain = atIndex !== -1 ? studentEmail.slice(atIndex + 1) : null;
        if (emailDomain) {
          await CollegeDomain.findOneAndUpdate(
            { email_domain: emailDomain },
            {
              $setOnInsert: {
                college_name: geminiResult.college,
                email_domain: emailDomain,
                verified: true,
                verified_at: new Date(),
                source: 'student_verification',
              },
            },
            { upsert: true, new: true }
          );
        }
      } catch (domainErr) {
        console.warn('CollegeDomain save failed (non-fatal):', domainErr.message);
      }
    }

    return res.json({
      ...checks,
      college:           geminiResult.college   || null,
      course:            geminiResult.course    || null,
      academicYearRange: geminiResult.academicYearRange || null,
      year_of_study,
      confidence:        geminiResult.confidence || 'medium',
      verdict,
      rejection_reason,
      source: 'gemini',
    });

  } catch (err) {
    console.error('Parse ID error:', err);
    res.status(500).json({ error: 'Failed to process ID card image.' });
  } finally {
    try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', upload.single('idCard'), async (req, res) => {
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
      needsAdminReview,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !userType) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!['student', 'working'].includes(userType)) {
      return res.status(400).json({ error: 'Invalid user type.' });
    }

    if (!verifiedEmails.has(email.toLowerCase())) {
      return res.status(403).json({ error: 'Email must be verified before registration.' });
    }

    // Check duplicate
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'User already exists.' });
    }

    // Build user object
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      userType,
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
      // Flag for admin review if AI scanning was unavailable
      if (needsAdminReview === 'true' || needsAdminReview === true) {
        userData.needsAdminReview = true;
        userData.reviewStatus = 'pending';
      }
    } else {
      userData.domain = domain?.trim();
      userData.organization = organization?.trim();
    }

    const user = await User.create(userData);
    verifiedEmails.delete(email.toLowerCase());

    // Send confirmation email (non-blocking)
    sendRegistrationEmail(user).catch((err) => console.error('Email error:', err));

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
        needsAdminReview: user.needsAdminReview || false,
        reviewStatus: user.reviewStatus || 'not_required',
        registeredEvents: user.registeredEvents,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/send-otp
// ─────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
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
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await user.verifyOtp(otp);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // Clear OTP after successful use
    user.otpHash = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user._id);
    return res.json({
      message: 'Login successful',
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
        needsAdminReview: user.needsAdminReview || false,
        reviewStatus: user.reviewStatus || 'not_required',
        registeredEvents: user.registeredEvents,
      },
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
    const user = await User.findById(req.userId).select('-otpHash -otpExpiry');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
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
        needsAdminReview: user.needsAdminReview || false,
        reviewStatus: user.reviewStatus || 'not_required',
        registeredEvents: user.registeredEvents,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
