const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    feedbackEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
