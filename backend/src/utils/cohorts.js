const User = require('../models/User');

const COHORT_CUTOFFS = {
  'June 13 & 14, 2026': new Date('2026-06-13T00:00:00+05:30')
};

async function getAvailableCohorts() {
  const now = new Date();
  const available = [];

  for (const [cohort, cutoff] of Object.entries(COHORT_CUTOFFS)) {
    // 1. Check if crossed date
    if (now >= cutoff) {
      continue;
    }

    // 2. Check if 1000 limit reached
    const count = await User.countDocuments({ selectedCohort: cohort });
    if (count >= 1000) {
      continue;
    }

    available.push(cohort);
  }

  return available;
}

module.exports = {
  COHORT_CUTOFFS,
  getAvailableCohorts
};
