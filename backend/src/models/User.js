const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const registeredEventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  registeredAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    userType: { type: String, enum: ['student', 'working'], required: true },

    // Student-specific fields
    collegeName: { type: String, trim: true },
    course: { type: String, trim: true },
    year: { type: String, trim: true },
    idCardPath: { type: String },

    // Working professional fields
    domain: { type: String, trim: true },

    // OTP for login
    otpHash: { type: String },
    otpExpiry: { type: Date },

    // Events booked
    registeredEvents: [registeredEventSchema],
  },
  { timestamps: true }
);

// Hash OTP before storing
userSchema.methods.setOtp = async function (otpPlain) {
  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(otpPlain, salt);
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

userSchema.methods.verifyOtp = async function (otpPlain) {
  if (!this.otpHash || !this.otpExpiry) return false;
  if (new Date() > this.otpExpiry) return false;
  return bcrypt.compare(otpPlain, this.otpHash);
};

module.exports = mongoose.model('User', userSchema, process.env.COLLECTION_NAME || 'users');
