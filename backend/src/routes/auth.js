const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const User = require('../models/User');

const { sendRegistrationEmail, sendOtpEmail, sendVerificationOtpEmail } = require('../utils/email');
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
    const { email, userType } = req.body;
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

    // ── STEP 1: Gemini — extract + forensic checks ──────────────────────
    const prompt = `You are a forensic document examiner. Your job is to analyze whether this image shows a genuine, physically-held Indian college or school ID card. It may contain a scan of both sides of the card. Be skeptical by default.

═══════════════════════════════════════
STEP 1 — PHYSICAL REALITY CHECK
═══════════════════════════════════════
A real physical card, photographed in the real world, will show at least 2-3 of these:

ACCEPT signals (physical card evidence):
- Uneven or slightly curved edges (real PVC cards bend/warp slightly)
- Lamination sheen, glare, or lens flare catching light unevenly
- Micro-shadows at card edges where it rests on a surface
- Lanyard punch hole at the top
- Slight perspective distortion (card not perfectly flat to camera)
- Background surface visible (table, hand, fabric, wall)
- Photo ID portrait with slightly compressed/printed look (not crisp digital)
- Wear, minor scratches, fingerprint smudges, or handling marks
- QR/barcode that appears physically printed (slightly pixelated, not vector-crisp)

REJECT signals (digital/fake card evidence):
- Perfectly flat, perfectly rectangular, zero-shadow card on a pure white/transparent background
- Card edges are razor-sharp with no environmental context whatsoever
- All text is perfectly kerned, pixel-perfect — looks like a live Canva document, not a printed card
- The portrait photo looks undeniably AI-generated: unnaturally smooth skin texture, 
  perfectly symmetrical face, studio-clean lighting that contradicts the card's environment,
  eyes that look glassy or too sharp
- Smart chip graphic has no physical depth or light reflection — looks pasted
- QR code or barcode looks vector-drawn (too perfect, no print grain)
- Card appears to float with a drop-shadow (this is a digital mockup)
- Phone UI elements visible: status bar, battery icon, time display, nav buttons

═══════════════════════════════════════
STEP 2 — SCREENSHOT / SCREEN DETECTION
═══════════════════════════════════════
Immediately return is_id_card: false if:
- You can see a phone/browser/app interface around the card
- There is a moiré pattern (wavy interference lines from photographing a screen)
- The image has the flat, backlit look of a screen rather than a physical object
- Pixel density looks uniform and digital rather than having print grain

═══════════════════════════════════════
STEP 3 — DOCUMENT TYPE CHECK
═══════════════════════════════════════
Reject if it is NOT a college/university/school/institution ID card:
- Handwritten notes, printed paper documents, receipts → reject
- Aadhaar, PAN, driving license, voter ID → reject (not institutional)
- Random selfie or photo of a person with no card → reject
- Business cards, corporate employee badges, gym/club memberships → reject strictly

Accept:
- College / university / polytechnic / institute / school student ID
- Staff/faculty ID from an educational institution

═══════════════════════════════════════
STEP 4 — EXPIRY CHECK
═══════════════════════════════════════
Current year: ${currentYear}

- If card shows explicit expiry date (e.g., "Valid Until: Dec 2023") and it is past → REJECT
- If card shows academic batch/year range (e.g., "2019-2023") and end year < ${currentYear} → REJECT
- If card shows "Valid Upto: [Month] [Year]" and that date is past → REJECT
- If no date is present on a student card → ACCEPT with confidence: "low"
- Staff/faculty cards with no expiry → ACCEPT

═══════════════════════════════════════
STEP 5 — INSTITUTION VALIDITY
═══════════════════════════════════════
- Extract the institution name exactly as printed
- Determine if this is a real, recognized Indian college, university, or institute
- Consider: IITs, NITs, state universities, autonomous colleges, deemed universities, 
  polytechnics, affiliated colleges under UGC/AICTE
- If the institution name appears fabricated, misspelled, or unverifiable → set is_valid_college: false

═══════════════════════════════════════
IMPORTANT BEHAVIORAL INSTRUCTIONS
═══════════════════════════════════════
- Be SKEPTICAL. When in doubt, reject.
- A card that looks "too perfect" — no glare, no shadow, no wear — is MORE suspicious, not less.
- Do NOT be fooled by presence of logos, QR codes, or chips. These are trivial to add digitally.
- Do NOT use text content alone to judge authenticity. Focus on PHYSICAL FORENSIC signals.
- The reason field must specifically name which physical signals were present or absent.

Return ONLY raw JSON, no markdown, no explanation outside the JSON:
{
  "is_id_card": true or false,
  "is_valid_college": true or false,
  "college": "string or null",
  "confidence": "high | medium | low",
  "physical_signals_detected": ["list", "of", "specific", "physical", "traits", "observed"],
  "red_flags": ["list", "of", "any", "suspicious", "elements", "or", "empty", "array"],
  "reason": "2-3 sentence forensic summary of why accepted or rejected."
}`;

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
        college: null,
        verdict: 'REVIEW',
        rejection_reason: 'The id is not found to be valid',
        source: 'gemini',
      });
    }

    // ── STEP 2: Early reject if not a valid ID card ──────────────
    if (!geminiResult.is_id_card) {
      return res.json({
        is_id_card: false,
        is_valid_college: false,
        college: null,
        verdict: 'REJECTED',
        rejection_reason: 'The id is not found to be valid',
        source: 'gemini',
      });
    }

    // ── STEP 3: Validate college via LLM (sole source of truth) ──
    const isValidCollege = geminiResult.is_valid_college === true;

    // ── STEP 4: Build verdict ────────────────────────────────────
    const checks = {
      is_id_card:       true, // already passed step 2
      is_valid_college: isValidCollege,
    };

    let verdict = 'APPROVED';
    let rejection_reason = null;

    if (!checks.is_valid_college) {
      verdict = 'REJECTED';
      rejection_reason = 'The id is not found to be valid';
    }

    return res.json({
      ...checks,
      college: geminiResult.college || null,
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
      heardFrom,
      referralCode,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !userType || !heardFrom) {
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

    // Waitlist Logic: If 1000 or more users already exist, new users go to waitlist
    const userCount = await User.countDocuments();
    const isWaitlisted = userCount >= 1000;

    const REFERRAL_MAP = {
      gkt01: 'gkt01 - Chetana N',
      gkt02: 'gkt02 - Dinesh T',
      gkt03: 'gkt03 - Indupriyadarshini V',
      gkt04: 'gkt04 - Balaji B',
      gkt05: 'gkt05 - Unassigned',
    };

    let mappedReferral = null;
    if (referralCode) {
      mappedReferral = REFERRAL_MAP[referralCode.toLowerCase()] || referralCode;
    }

    // Build user object
    const userData = {
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      userType,
      heardFrom: heardFrom.trim(),
      referralCode: mappedReferral,
      isWaitlisted,
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
        collegeName: user.collegeName,
        course: user.course,
        year: user.year,
        domain: user.domain,
        organization: user.organization,
        heardFrom: user.heardFrom,
        isWaitlisted: user.isWaitlisted,
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
        heardFrom: user.heardFrom,
        isWaitlisted: user.isWaitlisted,
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
        heardFrom: user.heardFrom,
        isWaitlisted: user.isWaitlisted,
        registeredEvents: user.registeredEvents,
        isFeedbackSubmitted: user.isFeedbackSubmitted,
        feedback: user.feedback,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── SUBMIT FEEDBACK ───────────────────────────────────────────
router.post('/feedback', authMiddleware, async (req, res) => {
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

module.exports = router;
