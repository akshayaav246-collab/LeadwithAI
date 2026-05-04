const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

let colleges = [];
try {
  const data = fs.readFileSync(path.join(__dirname, '../data/colleges.json'), 'utf-8');
  colleges = JSON.parse(data);
} catch (err) {
  console.error('Failed to load colleges data:', err);
}

// GET /api/data/colleges
router.get('/colleges', (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  
  let results = colleges;
  if (query) {
    results = colleges.filter((college) => college.toLowerCase().includes(query));
  }
  
  // Return top 50 results to keep payload small
  res.json({ colleges: results.slice(0, 50) });
});

// POST /api/data/colleges
router.post('/colleges', (req, res) => {
  const { college } = req.body;
  
  if (!college || typeof college !== 'string' || college.trim().length < 3) {
    return res.status(400).json({ error: 'Invalid college name' });
  }
  
  const trimmedCollege = college.trim();
  
  // Add to in-memory array if it doesn't exist
  if (!colleges.includes(trimmedCollege)) {
    colleges.push(trimmedCollege);
    colleges.sort();
    
    // Write back to file asynchronously
    const collegesJsonPath = path.join(__dirname, '../data/colleges.json');
    fs.writeFile(collegesJsonPath, JSON.stringify(colleges, null, 2), (err) => {
      if (err) console.error('Error saving new college:', err);
    });
  }
  
  res.json({ success: true, college: trimmedCollege });
});

module.exports = router;
