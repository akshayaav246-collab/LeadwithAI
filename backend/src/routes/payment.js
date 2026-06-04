const express = require('express');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const Razorpay = require('razorpay');
const User = require('../models/User');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const { registerForWebinar } = require('../utils/zoom');
const authMiddleware = require('../middleware/auth');
const Joi = require('joi');
const validate = require('../middleware/validate');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
const AMOUNT_STUDENT_PAISE = 49900;  // ₹499 for students
const AMOUNT_WORKING_PAISE = 99900;  // ₹999 for working professionals/others

// ─────────────────────────────────────────────
// POST /api/payment/create-order  (protected)
// ─────────────────────────────────────────────
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Block payment if profile is incomplete
    if (user.isProfileComplete === false) {
      return res.status(400).json({ error: 'Please complete your profile before proceeding to payment.' });
    }

    // Check if already paid for this event
    const alreadyPaid = user.registeredEvents.find(
      (e) => e.eventName === EVENT_NAME && e.paymentStatus === 'confirmed'
    );
    if (alreadyPaid) {
      return res.status(409).json({ error: 'You have already paid for this event.' });
    }

    // Determine amount based on user type
    const amountPaise = user.userType === 'student' ? AMOUNT_STUDENT_PAISE : AMOUNT_WORKING_PAISE;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${user._id.toString().slice(-6)}_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        eventName: EVENT_NAME,
      },
    });

    // Create or update a pending event entry
    let pendingEvent = user.registeredEvents.find(e => e.eventName === EVENT_NAME && e.paymentStatus === 'pending');
    if (pendingEvent) {
      pendingEvent.razorpayOrderId = order.id;
    } else {
      user.registeredEvents.push({
        eventName: EVENT_NAME,
        razorpayOrderId: order.id,
        paymentStatus: 'pending',
      });
    }
    await user.save();

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      userName: user.fullName,
      userEmail: user.email,
      userPhone: user.phone,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/verify  (protected)
// ─────────────────────────────────────────────
const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required()
});

router.post('/verify', authMiddleware, validate(verifyPaymentSchema), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Update user's event status
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Block verification if profile is incomplete
    if (user.isProfileComplete === false) {
      return res.status(400).json({ error: 'Please complete your profile before verifying payment.' });
    }

    const eventEntry = user.registeredEvents.find(
      (e) => e.razorpayOrderId === razorpay_order_id
    );
    if (eventEntry) {
      eventEntry.razorpayPaymentId = razorpay_payment_id;
      eventEntry.paymentStatus = 'confirmed';
      
      // Register for Zoom Webinar
      try {
        const [firstName, ...lastNameParts] = user.fullName.split(' ');
        const joinUrl = await registerForWebinar(
          user.email,
          firstName,
          lastNameParts.join(' '),
          user.selectedCohort
        );
        eventEntry.zoomJoinUrl = joinUrl;
        eventEntry.zoomRegistrationStatus = 'success';
      } catch (zoomErr) {
        console.error('Failed to register user to Zoom during payment verify:', zoomErr);
        eventEntry.zoomRegistrationStatus = 'failed';
        // We do not fail the payment verification if Zoom fails, we just log it
      }

      await user.save();
    }

    // Send payment confirmation email (non-blocking)
    sendPaymentConfirmationEmail(user, EVENT_NAME, razorpay_payment_id, eventEntry?.zoomJoinUrl)
      .then(async () => {
        if (eventEntry) {
          eventEntry.emailConfirmationStatus = 'success';
          await user.save();
        }
      })
      .catch(async (err) => {
        console.error('Payment email error:', err);
        if (eventEntry) {
          eventEntry.emailConfirmationStatus = 'failed';
          await user.save();
        }
      }); 

    return res.json({
      message: 'Payment verified and confirmed!',
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Server error during verification.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/webhook (Razorpay Webhook)
// ─────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !req.rawBody) {
      return res.status(400).send('Bad Request: Missing signature or body');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const payload = req.body;
    
    // We only care about payment.captured or order.paid
    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      const paymentEntity = payload.event === 'payment.captured' ? payload.payload.payment.entity : null;
      const orderEntity = payload.event === 'order.paid' ? payload.payload.order.entity : null;
      
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const paymentId = paymentEntity?.id || null;
      
      if (!orderId) {
        return res.status(200).send('OK: Missing orderId in payload');
      }

      // Find user with this pending order
      const user = await User.findOne({
        'registeredEvents.razorpayOrderId': orderId
      });

      if (!user) {
        return res.status(200).send('OK: User not found for this order');
      }

      const eventEntry = user.registeredEvents.find(e => e.razorpayOrderId === orderId);
      
      // If already confirmed (e.g. by client verification), just return 200
      if (eventEntry.paymentStatus === 'confirmed') {
        return res.status(200).send('OK: Already confirmed');
      }

      // Confirm payment
      eventEntry.paymentStatus = 'confirmed';
      if (paymentId) eventEntry.razorpayPaymentId = paymentId;

      // Register for Zoom
      try {
        const [firstName, ...lastNameParts] = user.fullName.split(' ');
        const joinUrl = await registerForWebinar(user.email, firstName, lastNameParts.join(' '), user.selectedCohort);
        eventEntry.zoomJoinUrl = joinUrl;
        eventEntry.zoomRegistrationStatus = 'success';
      } catch (zoomErr) {
        console.error('Webhook Zoom Registration failed:', zoomErr);
        eventEntry.zoomRegistrationStatus = 'failed';
      }

      await user.save();

      // Send Email
      sendPaymentConfirmationEmail(user, EVENT_NAME, paymentId || eventEntry.razorpayPaymentId, eventEntry.zoomJoinUrl)
        .then(async () => {
          eventEntry.emailConfirmationStatus = 'success';
          await user.save();
        })
        .catch(async (err) => {
          console.error('Webhook Email Registration failed:', err);
          eventEntry.emailConfirmationStatus = 'failed';
          await user.save();
        });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// --- Multer config for Nepal Payment Proof ---
const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `proof-${unique}${path.extname(file.originalname)}`);
  },
});

const uploadProof = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/i;
    const extname = filetypes.test(path.extname(file.originalname));
    const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG/JPG/PNG) and PDF files are allowed as proof (max 5MB)'));
  }
});

// ─────────────────────────────────────────────
// POST /api/payment/submit-nepal-proof (protected)
// ─────────────────────────────────────────────
router.post('/submit-nepal-proof', authMiddleware, async (req, res) => {
  try {
    const { txnRef } = req.body;
    if (!txnRef || !txnRef.trim()) {
      return res.status(400).json({ error: 'Transaction reference ID (UTR) is required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let eventEntry = user.registeredEvents.find(e => e.eventName === EVENT_NAME);
    if (!eventEntry) {
      eventEntry = {
        eventName: EVENT_NAME,
        paymentStatus: 'pending',
      };
      user.registeredEvents.push(eventEntry);
      eventEntry = user.registeredEvents[user.registeredEvents.length - 1];
    }

    eventEntry.paymentMethod = 'nepal_upi';
    eventEntry.nepalUpiTxnRef = txnRef.trim();
    eventEntry.paymentStatus = 'pending';

    await user.save();

    return res.json({
      message: 'Payment proof submitted successfully!',
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
        isProfileComplete: user.isProfileComplete,
      }
    });

  } catch (err) {
    console.error('Submit Nepal proof error:', err);
    res.status(500).json({ error: 'Failed to submit payment proof.' });
  }
});


module.exports = router;