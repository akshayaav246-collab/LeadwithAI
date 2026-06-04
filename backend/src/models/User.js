const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const registeredEventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paymentMethod: { type: String, enum: ['razorpay', 'nepal_upi'], default: 'razorpay' },
  nepalUpiTxnRef: { type: String },
  nepalUpiScreenshotPath: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  },
  zoomRegistrationStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  emailConfirmationStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
  },
  zoomJoinUrl: { type: String },
  registeredAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    phone: { type: String, trim: true },
    userType: { type: String, enum: ['student', 'working'] },

    // Student-specific fields
    collegeName: { type: String, trim: true },
    course: { type: String, trim: true },
    year: { type: String, trim: true },
    idCardPath: { type: String },

    // Working professional fields
    domain: { type: String, trim: true },
    organization: { type: String, trim: true },

    // OTP for login
    otpHash: { type: String },
    otpExpiry: { type: Date },

    // Registration metadata
    heardFrom: { type: String },
    isWaitlisted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    referralCode: { type: String, default: null },
    selectedCohort: { type: String, default: null },
    isAdminCreated: { type: Boolean, default: false },

    // Feedback for the 4 sessions
    feedback: [{
      session: { type: String, required: true },
      rating:  { type: String, enum: ['Excellent', 'Good', 'Average', 'Poor'], required: true },
      text:    { type: String, default: '' }
    }],
    isFeedbackSubmitted: { type: Boolean, default: false },

    // Events booked
    registeredEvents: [registeredEventSchema],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
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

userSchema.virtual('isProfileComplete').get(function () {
  return !!(this.phone && this.phone.trim());
});

module.exports = mongoose.model('User', userSchema, process.env.COLLECTION_NAME || 'users');
