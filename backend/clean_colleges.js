const fs = require('fs');
const path = require('path');

const collegesJsonPath = path.join(__dirname, 'src/data/colleges.json');
let colleges = JSON.parse(fs.readFileSync(collegesJsonPath, 'utf8'));

const cleaned = new Set();

for (let name of colleges) {
    // Remove leading numbers (like "100Grace" -> "Grace")
    let cleanName = name.replace(/^\d+/, '').trim();
    
    // Remove specific invalid sentences
    if (cleanName.includes('Affiliated (Non-Autonomous)') ||
        cleanName.includes('Affiliated colleges follow') ||
        cleanName.includes('Affiliated to Anna University') ||
        cleanName.includes('Autonomous Engineering Colleges') ||
        cleanName.includes('Autonomous colleges are') ||
        cleanName.includes('B.E./B.Tech') ||
        cleanName.includes('CategoryCount') ||
        cleanName.includes('College Name') ||
        cleanName.includes('ENGINEERING COLLEGES IN TAMIL NADU') ||
        cleanName.includes('For the complete') ||
        cleanName.includes('For the most current') ||
        cleanName.includes('Note: Tamil Nadu') ||
        cleanName.includes('SECTION 1') ||
        cleanName.includes('SECTION 2') ||
        cleanName.includes('Segregated into') ||
        cleanName.includes('Source: Anna University') ||
        cleanName.includes('Total Listed') ||
        cleanName.includes('examinations, and award')) {
        continue;
    }
    
    // Fix missing spaces like "TechnologyCoimbatore"
    cleanName = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Fix things like "EngineeringThoothukudi" -> "Engineering Thoothukudi"
    
    if (cleanName.length > 5) {
        cleaned.add(cleanName);
    }
}

const finalArray = [...cleaned].sort();
fs.writeFileSync(collegesJsonPath, JSON.stringify(finalArray, null, 2));

console.log("Cleaned colleges. Total:", finalArray.length);
