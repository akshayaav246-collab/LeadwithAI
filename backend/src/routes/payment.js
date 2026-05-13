const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');
const { sendPaymentConfirmationEmail } = require('../utils/email');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EVENT_NAME = 'Lead with AI: Adopt, Implement and Transform';
const AMOUNT_STUDENT_PAISE = 50000;  // ₹500 for students
const AMOUNT_WORKING_PAISE = 99900;  // ₹999 for working professionals/others

// ─────────────────────────────────────────────
// POST /api/payment/create-order  (protected)
// ─────────────────────────────────────────────
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Check if already paid for this event
    const alreadyPaid = user.registeredEvents.find(
      (e) => e.eventName === EVENT_NAME && e.paymentStatus === 'confirmed'
    );
    if (alreadyPaid) {
      return res.status(409).json({ error: 'You have already paid for this event.' });
    }

    // Block payment until admin approves the profile review
    // Also catches legacy records where reviewStatus defaulted to 'not_required' but needsAdminReview is true
    const paymentBlocked = user.needsAdminReview && user.reviewStatus !== 'approved';
    if (paymentBlocked) {
      return res.status(403).json({
        error: 'Your registration is currently under review. Payment will be enabled once our team approves your profile.',
        reviewPending: true,
      });
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
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details.' });
    }

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

    const eventEntry = user.registeredEvents.find(
      (e) => e.razorpayOrderId === razorpay_order_id
    );
    if (eventEntry) {
      eventEntry.razorpayPaymentId = razorpay_payment_id;
      eventEntry.paymentStatus = 'confirmed';
      await user.save();
    }

    // Send payment confirmation email (non-blocking)
    sendPaymentConfirmationEmail(user, EVENT_NAME, razorpay_payment_id).catch((err) =>
      console.error('Payment email error:', err)
    ); 

    return res.json({
      message: 'Payment verified and confirmed!',
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Server error during verification.' });
  }
});

module.exports = router;