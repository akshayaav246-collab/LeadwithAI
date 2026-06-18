const express = require('express');
const crypto = require('crypto');
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

// Helper to check if event is confirmed
const isConfirmed = (u) => {
  const ev = u.registeredEvents.find(e => e.eventName === EVENT_NAME);
  return ev && ev.paymentStatus === 'confirmed';
};

// ─────────────────────────────────────────────
// POST /api/payment/create-order  (protected)
// ─────────────────────────────────────────────
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Block payment if waitlisted
    if (user.isWaitlisted) {
      return res.status(403).json({ error: 'You are currently waitlisted and cannot proceed to payment.' });
    }

    // Block payment if profile is incomplete
    if (user.isProfileComplete === false) {
      return res.status(400).json({ error: 'Please complete your profile before proceeding to payment.' });
    }

    // Determine who needs to be paid for (including attendees)
    const usersToPayFor = [];
    if (!isConfirmed(user)) {
      usersToPayFor.push(user);
    }

    // Find all group members registered by this user
    const attendees = await User.find({ groupLeaderId: user._id });
    for (const member of attendees) {
      if (!isConfirmed(member)) {
        usersToPayFor.push(member);
      }
    }

    if (usersToPayFor.length === 0) {
      return res.status(409).json({ error: 'You have already paid.' });
    }

    // Calculate total amount (summing up leader + attendees)
    let totalAmountPaise = 0;
    for (const u of usersToPayFor) {
      totalAmountPaise += u.userType === 'student' ? AMOUNT_STUDENT_PAISE : AMOUNT_WORKING_PAISE;
    }

    const order = await razorpay.orders.create({
      amount: totalAmountPaise,
      currency: 'INR',
      receipt: `rcpt_${user._id.toString().slice(-6)}_${Date.now()}`,
      notes: {
        userIds: usersToPayFor.map(u => u._id.toString()).join(','),
        eventName: EVENT_NAME,
      },
    });

    // Save order ID on all pending events for the subset of users
    for (const u of usersToPayFor) {
      let pendingEvent = u.registeredEvents.find(e => e.eventName === EVENT_NAME && e.paymentStatus === 'pending');
      if (pendingEvent) {
        pendingEvent.razorpayOrderId = order.id;
        pendingEvent.paymentMethod = 'razorpay';
      } else {
        u.registeredEvents.push({
          eventName: EVENT_NAME,
          razorpayOrderId: order.id,
          paymentMethod: 'razorpay',
          paymentStatus: 'pending',
        });
      }
      await u.save();
    }

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

    // Find all users associated with this order ID
    const users = await User.find({
      'registeredEvents.razorpayOrderId': razorpay_order_id
    });

    if (users.length === 0) {
      return res.status(404).json({ error: 'No registrations found matching this order ID.' });
    }

    for (const u of users) {
      // Confirm profile is complete for safety (skip this for attendees paid by leader)
      if (u.isProfileComplete === false && !u.groupLeaderId) {
        continue;
      }

      const eventEntry = u.registeredEvents.find(
        (e) => e.razorpayOrderId === razorpay_order_id
      );
      if (eventEntry && eventEntry.paymentStatus !== 'confirmed') {
        eventEntry.razorpayPaymentId = razorpay_payment_id;
        eventEntry.paymentStatus = 'confirmed';
        eventEntry.amountPaid = u.userType === 'student' ? 499 : 999;
        
        // Register for Zoom Webinar
        try {
          const [firstName, ...lastNameParts] = u.fullName.split(' ');
          const joinUrl = await registerForWebinar(
            u.email,
            firstName,
            lastNameParts.join(' '),
            u.selectedCohort || 'June 13 & 14, 2026'
          );
          eventEntry.zoomJoinUrl = joinUrl;
          eventEntry.zoomRegistrationStatus = 'success';
        } catch (zoomErr) {
          console.error(`Failed to register user ${u.email} to Zoom:`, zoomErr);
          eventEntry.zoomRegistrationStatus = 'failed';
        }

        await u.save();

        // Send payment confirmation email (non-blocking)
        sendPaymentConfirmationEmail(u, EVENT_NAME, razorpay_payment_id, eventEntry.zoomJoinUrl)
          .then(async () => {
            await User.updateOne(
              { _id: u._id, 'registeredEvents.razorpayOrderId': razorpay_order_id },
              { $set: { 'registeredEvents.$.emailConfirmationStatus': 'success' } }
            );
          })
          .catch(async (err) => {
            console.error(`Email confirmation error for ${u.email}:`, err);
            await User.updateOne(
              { _id: u._id, 'registeredEvents.razorpayOrderId': razorpay_order_id },
              { $set: { 'registeredEvents.$.emailConfirmationStatus': 'failed' } }
            );
          });
      }
    }

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

      // Find all users with this pending order
      const users = await User.find({
        'registeredEvents.razorpayOrderId': orderId
      });

      for (const u of users) {
        const eventEntry = u.registeredEvents.find(e => e.razorpayOrderId === orderId);
        if (eventEntry && eventEntry.paymentStatus !== 'confirmed') {
          eventEntry.paymentStatus = 'confirmed';
          if (paymentId) eventEntry.razorpayPaymentId = paymentId;

          // Register for Zoom
          try {
            const [firstName, ...lastNameParts] = u.fullName.split(' ');
            const joinUrl = await registerForWebinar(u.email, firstName, lastNameParts.join(' '), u.selectedCohort || 'June 13 & 14, 2026');
            eventEntry.zoomJoinUrl = joinUrl;
            eventEntry.zoomRegistrationStatus = 'success';
          } catch (zoomErr) {
            console.error(`Webhook Zoom Registration failed for ${u.email}:`, zoomErr);
            eventEntry.zoomRegistrationStatus = 'failed';
          }

          await u.save();

          // Send Email
          sendPaymentConfirmationEmail(u, EVENT_NAME, paymentId || eventEntry.razorpayPaymentId, eventEntry.zoomJoinUrl)
            .then(async () => {
              await User.updateOne(
                { _id: u._id, 'registeredEvents.razorpayOrderId': orderId },
                { $set: { 'registeredEvents.$.emailConfirmationStatus': 'success' } }
              );
            })
            .catch(async (err) => {
              console.error(`Webhook Email Registration failed for ${u.email}:`, err);
              await User.updateOne(
                { _id: u._id, 'registeredEvents.razorpayOrderId': orderId },
                { $set: { 'registeredEvents.$.emailConfirmationStatus': 'failed' } }
              );
            });
        }
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;