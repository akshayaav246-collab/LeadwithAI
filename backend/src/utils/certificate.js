const sharp = require('sharp');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Calibrator parameters to position name and QR code on the 3200x2200 template
const CERTIFICATE_CONFIG = {
  name: {
    x: 1600,             // Horizontal center of the template (3200 / 2)
    y: 950,              // New vertical position
    fontSize: 100,       // New font size
    color: '#0a0d3d',    // New name color
    textAnchor: 'middle' // 'middle' aligns center to x
  },
  qr: {
    x: 330,              // New horizontal position
    y: 1635,             // New vertical position
    size: 380            // New QR size
  }
};

/**
 * Generates certificate image for a participant and saves it to local uploads
 * @param {string} participantName 
 * @param {string} userId 
 * @returns {Promise<{ filePath: string, buffer: Buffer }>}
 */
async function generateCertificate(participantName, userId) {
  let templateName = 'Certificate_13&14.png';
  try {
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(userId)) {
      const User = require('../models/User');
      const user = await User.findById(userId).select('selectedCohort');
      if (user && user.selectedCohort && user.selectedCohort.includes('27 & 28')) {
        templateName = 'Certificate_27&28.png';
      }
    }
  } catch (err) {
    console.error('Error finding user cohort for certificate:', err);
  }
  const templatePath = path.join(__dirname, `../../../frontend/public/${templateName}`);
  
  // Create output directory if not exists
  const outputDir = path.join(__dirname, '../../uploads/certificates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${userId}.jpg`);
  
  // Construct certificate verification URL
  const frontendHost = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' 
    ? 'https://www.globalknowledgetech.com/leadwithAI' 
    : 'http://localhost:5173');
  const verifyUrl = `${frontendHost.replace(/\/$/, '')}/verify/${userId}`;

  // 1. Generate QR Code Buffer
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: CERTIFICATE_CONFIG.qr.size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  // 2. Generate SVG Text Overlay Buffer (Times New Roman, Bold)
  const svgText = `
    <svg width="3200" height="2200">
      <style>
        .participant-name {
          font-family: 'Times New Roman', Times, serif;
          font-weight: bold;
          fill: ${CERTIFICATE_CONFIG.name.color};
        }
      </style>
      <text 
        x="${CERTIFICATE_CONFIG.name.x}" 
        y="${CERTIFICATE_CONFIG.name.y}" 
        font-size="${CERTIFICATE_CONFIG.name.fontSize}px" 
        text-anchor="${CERTIFICATE_CONFIG.name.textAnchor}" 
        class="participant-name"
      >
        ${participantName}
      </text>
    </svg>
  `;
  const textBuffer = Buffer.from(svgText);

  // 3. Composite everything using sharp
  const buffer = await sharp(templatePath)
    .composite([
      { input: qrBuffer, left: CERTIFICATE_CONFIG.qr.x, top: CERTIFICATE_CONFIG.qr.y },
      { input: textBuffer, left: 0, top: 0 }
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // Save to disk for reference or download links
  await fs.promises.writeFile(outputPath, buffer);

  return {
    filePath: outputPath,
    buffer
  };
}

module.exports = {
  CERTIFICATE_CONFIG,
  generateCertificate
};
