const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '../frontend/public/tn_colleges.xlsx');
const collegesJsonPath = path.join(__dirname, 'src/data/colleges.json');

try {
  // Read existing colleges
  let existingColleges = [];
  try {
    const existingData = fs.readFileSync(collegesJsonPath, 'utf8');
    existingColleges = JSON.parse(existingData);
  } catch (e) {
    console.error("No existing colleges found, starting fresh.");
  }

  // Parse Excel
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to array of arrays
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const newColleges = [];
  
  for (let row of data) {
    // Assuming college names might be in the first or second column
    for (let cell of row) {
      if (typeof cell === 'string' && cell.trim().length > 5) {
        let val = cell.trim();
        // Simple heuristic: if it contains 'College', 'Institute', 'University', 'Technology'
        const lower = val.toLowerCase();
        if (lower.includes('college') || lower.includes('institute') || lower.includes('university') || lower.includes('technology') || lower.includes('school')) {
            newColleges.push(val);
        }
      }
    }
  }

  // Merge
  const allColleges = [...new Set([...existingColleges, ...newColleges])].sort();
  
  // Save
  fs.writeFileSync(collegesJsonPath, JSON.stringify(allColleges, null, 2));
  
  console.log(`Successfully extracted and merged. Total colleges now: ${allColleges.length}`);

} catch (err) {
  console.error("Error parsing Excel:", err);
}
