const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const { sendRegistrationEmail, sendOtpEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// In-memory stores for registration email verification
const registerOtps = new Map();
const verifiedEmails = new Set();

// ─────────────────────────────────────────────
// POST /api/auth/send-register-otp
// ─────────────────────────────────────────────
router.post('/send-register-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'User already exists. Please login instead.' });
    }

    const otp = generateOtp();
    registerOtps.set(email.toLowerCase(), {
      otp,
      expiry: Date.now() + 10 * 60 * 1000 // 10 mins
    });

    await sendOtpEmail(email.toLowerCase(), otp, 'Future Participant');
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
const { GoogleGenAI } = require('@google/genai');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;

router.post('/parse-id', upload.single('idCard'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No ID card image provided.' });
  }

  const filePath = req.file.path;

  // Helper: calculate year of study from academic year range
  function calcYearFromRange(startYear, endYear) {
    const currentYear = new Date().getFullYear();
    const totalYears = endYear - startYear;
    const elapsed = currentYear - startYear;
    const yearNum = Math.min(Math.max(elapsed, 1), totalYears);
    const suffix = ['1st', '2nd', '3rd', '4th', '5th'];
    return (suffix[yearNum - 1] || yearNum + 'th') + ' Year';
  }

  // Helper: extract year from academic range string like "2022-2026" or "2022 - 2026"
  function parseYearFromRange(rawText) {
    const rangeMatch = rawText.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      if (end > start && (end - start) <= 6) {
        return calcYearFromRange(start, end);
      }
    }
    // Try explicit year text
    const explicitMatch = rawText.match(/(1st|2nd|3rd|4th|5th|I{1,4}|VI?I{0,2})\s*(Year|Yr)/i);
    if (explicitMatch) return explicitMatch[0];
    return '';
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Convert file to base64 for Gemini
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `You are an OCR assistant. Carefully read this student college ID card image and extract the following details:

1. College Name: Look for the college/university/institute name — it may appear as text, a header, a logo label, or a watermark. Return the full name.
2. Course: The degree program. Examples: B.E(CSE), B.Tech, MBA, MCA, BSc, MSc. Include the branch in parentheses if present (e.g., "B.E(CSE)").
3. Academic Year Range: The enrollment period shown on the card (e.g., "2022 - 2026", "2023-2025"). Return exactly as printed.

Return ONLY raw JSON — no markdown, no explanation:
{
  "college": "",
  "course": "",
  "academicYearRange": ""
}

If a field cannot be found, use an empty string "".`;

    try {
      // 1. Try Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: base64Image,
              mimeType: req.file.mimetype,
            },
          },
        ],
      });

      // Strip markdown code fences if present
      let rawText = response.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(rawText);

      const year = parseYearFromRange(parsed.academicYearRange || '');

      return res.json({
        college: parsed.college || '',
        course: parsed.course || '',
        year,
        source: 'gemini',
      });
    } catch (geminiErr) {
      console.warn('Gemini extraction failed, falling back to Tesseract OCR:', geminiErr.message);

      // 2. Fallback to Tesseract
      // For PDFs, sharp can't rasterise, so we pass the raw buffer and let Tesseract attempt it.
      // For images, preprocess with sharp for better OCR quality.
      let ocrBuffer = imageBuffer;
      const isPdf = req.file.mimetype === 'application/pdf';

      if (!isPdf) {
        try {
          ocrBuffer = await sharp(imageBuffer)
            .grayscale()
            .normalize()
            .toBuffer();
        } catch (sharpErr) {
          console.warn('Sharp preprocessing failed, using raw buffer:', sharpErr.message);
        }
      }

      const { data: { text } } = await Tesseract.recognize(ocrBuffer, 'eng');

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const fullText = lines.join(' ');

      let college = '';
      let course = '';
      let year = '';

      const courseRegex = /(B\.E|B\.Tech|MBA|MCA|BSc|MSc)(\([^)]+\))?/i;
      const collegeRegex = /(college|institute|university)/i;

      for (const line of lines) {
        if (!college && collegeRegex.test(line)) college = line;
        if (!course) {
          const match = line.match(courseRegex);
          if (match) course = match[0];
        }
      }

      // Try to get year from academic range in the full text
      year = parseYearFromRange(fullText);

      return res.json({
        college,
        course,
        year,
        source: 'tesseract',
      });
    }

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
