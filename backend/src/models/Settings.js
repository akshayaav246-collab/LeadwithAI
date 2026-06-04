const mongoose = require('mongoose');

const referralCodeSchema = new mongoose.Schema({
  code:     { type: String, required: true, lowercase: true, trim: true },
  label:    { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const settingsSchema = new mongoose.Schema(
  {
    feedbackEnabled:      { type: Boolean, default: false },
    isMaintenanceMode:    { type: Boolean, default: false },
    registrationCap:      { type: Number,  default: 1000 },
    referralCodes:        { type: [referralCodeSchema], default: [] },
    activeReminderCohort: { type: String,  default: null },
  },
  { timestamps: true }
);

// ── Singleton helper ─────────────────────────────────────────
// Fetch (or create) the single Settings document, and auto-seed
// the hardcoded legacy referral codes if not already present.
const LEGACY_CODES = [
  { code: 'gkt01', label: 'gkt01 - Chetana N',             isActive: true },
  { code: 'gkt02', label: 'gkt02 - Dinesh T',              isActive: true },
  { code: 'gkt03', label: 'gkt03 - Indupriyadarshini V',   isActive: true },
  { code: 'gkt04', label: 'gkt04 - Balaji B',              isActive: true },
  { code: 'gkt05', label: 'gkt05 - Unassigned',            isActive: true },
];

settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ referralCodes: LEGACY_CODES });
    return settings;
  }

  // Migrate: add any legacy codes that are not yet stored
  let dirty = false;
  for (const legacy of LEGACY_CODES) {
    const exists = settings.referralCodes.some(r => r.code === legacy.code);
    if (!exists) {
      settings.referralCodes.push(legacy);
      dirty = true;
    }
  }
  if (dirty) await settings.save();

  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);

