const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const pdfPath = path.join(__dirname, '../frontend/public/TamilNadu_Engineering_Colleges.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdfParse(dataBuffer).then(function(data) {
    // text of the pdf
    const text = data.text;
    
    // Split by lines
    const lines = text.split('\n');
    const colleges = [];
    
    for (let line of lines) {
        line = line.trim();
        // Skip empty lines or small artifacts
        if (line.length < 5) continue;
        
        // Remove numbering if it exists (e.g. "1. PSG College" -> "PSG College")
        line = line.replace(/^\d+[\.\)]\s*/, '').trim();
        
        // Exclude generic headers or table headers if they exist in the PDF
        const lower = line.toLowerCase();
        if (lower.includes('page') || lower.includes('college code') || lower.includes('s.no') || lower === 'tamilnadu engineering colleges') {
            continue;
        }
        
        // Add if valid looking college name
        if (line && !colleges.includes(line)) {
            colleges.push(line);
        }
    }
    
    // Read existing colleges
    const collegesJsonPath = path.join(__dirname, 'src/data/colleges.json');
    let existingColleges = [];
    try {
        const existingData = fs.readFileSync(collegesJsonPath, 'utf8');
        existingColleges = JSON.parse(existingData);
    } catch (e) {
        console.error("No existing colleges found, creating new");
    }
    
    // Merge
    const allColleges = [...new Set([...existingColleges, ...colleges])].sort();
    
    // Save
    fs.writeFileSync(collegesJsonPath, JSON.stringify(allColleges, null, 2));
    
    console.log(`Successfully extracted and merged. Total colleges: ${allColleges.length}`);
}).catch(err => {
    console.error("Error parsing PDF:", err);
});
