const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    expiry: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL Index to automatically delete documents when the expiry time is reached
otpSchema.index({ expiry: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
