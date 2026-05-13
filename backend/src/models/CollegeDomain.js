const mongoose = require('mongoose');

const collegeDomainSchema = new mongoose.Schema(
  {
    college_name:  { type: String, required: true, trim: true },
    email_domain:  { type: String, required: true, unique: true, lowercase: true, trim: true },
    verified:      { type: Boolean, default: true },
    verified_at:   { type: Date, default: Date.now },
    source:        { type: String, default: 'student_verification' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CollegeDomain', collegeDomainSchema);
