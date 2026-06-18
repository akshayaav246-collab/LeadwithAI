const User = require('../models/User');

function getCohortCutoff(cohortStr) {
  if (!cohortStr) return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const match = cohortStr.match(/([A-Za-z]+)\s+(\d+)\s*(?:&\s*(\d+))?,\s*(\d{4})/);
  if (match) {
    const monthStr = match[1];
    const day1 = parseInt(match[2], 10);
    const year = parseInt(match[4], 10);
    
    const months = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = months[monthStr.toLowerCase()] !== undefined ? months[monthStr.toLowerCase()] : 5;
    
    // Return Date object for start of day in local time
    return new Date(year, month, day1, 0, 0, 0);
  }
  // Far future fallback if format doesn't match
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
}

async function getAvailableCohorts() {
  const Settings = require('../models/Settings');
  const settings = await Settings.findOne();
  const cohorts = settings ? settings.cohorts : ['June 13 & 14, 2026'];
  const now = new Date();
  const available = [];

  for (const cohort of cohorts) {
    const cutoff = getCohortCutoff(cohort);
    if (now >= cutoff) {
      continue;
    }

    const count = await User.countDocuments({ selectedCohort: cohort });
    if (count >= 1000) {
      continue;
    }

    available.push(cohort);
  }

  return available;
}

module.exports = {
  getAvailableCohorts,
  getCohortCutoff
};
