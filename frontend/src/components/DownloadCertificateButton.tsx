import React, { useRef, useState } from 'react';
import QRCode from 'qrcode';
import { publicAsset } from '../lib/assets';
import { toast } from 'sonner';

interface DownloadCertificateButtonProps {
  fullName: string;
  userId?: string;
}

// Config matches the backend and admin preview coordinates exactly (3200x2200 resolution)
const CONFIG = {
  name: {
    x: 1600,             // Horizontal center
    y: 950,              // Vertical position
    fontSize: 100,       // Font size
    color: '#0a0d3d',    // Text color
    font: "'Times New Roman', Times, serif",
    textAnchor: 'middle' // aligns center to x
  },
  qr: {
    x: 330,              // Horizontal position
    y: 1635,             // Vertical position
    size: 380            // QR size
  }
};

export function DownloadCertificateButton({ fullName, userId }: DownloadCertificateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The public URL where anyone can scan and verify the certificate
  const origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin
    : 'https://www.globalknowledgetech.com';
  const verificationUrl = userId 
    ? `${origin}/leadwithAI/verify/${userId}`
    : `${origin}/leadwithAI`;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 1. Load Base Certificate Template
      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";
      baseImg.src = publicAsset("Certificate.png");
      await new Promise((resolve, reject) => {
        baseImg.onload = resolve;
        baseImg.onerror = reject;
      });

      // 2. Generate QR Code image data URL
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: CONFIG.qr.size, margin: 1 });
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
      });

      // 3. Prepare Canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context not available");

      // Set canvas dimensions to match the 3200x2200 template exactly
      canvas.width = baseImg.width;
      canvas.height = baseImg.height;

      // 4. Draw Base Image
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      // 5. Draw Participant Name (Times New Roman, Bold)
      ctx.font = `bold ${CONFIG.name.fontSize}px ${CONFIG.name.font}`;
      ctx.fillStyle = CONFIG.name.color;
      ctx.textAlign = (CONFIG.name.textAnchor === 'middle' ? 'center' : 'left') as CanvasTextAlign;
      ctx.fillText(fullName, CONFIG.name.x, CONFIG.name.y);

      // 6. Draw QR Code
      ctx.drawImage(qrImg, CONFIG.qr.x, CONFIG.qr.y, CONFIG.qr.size, CONFIG.qr.size);

      // 7. Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Certificate_${fullName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate certificate:", error);
      toast.error("Failed to generate the certificate. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <button 
        className="btn-primary" 
        onClick={handleDownload} 
        disabled={isGenerating}
        style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
      >
        {isGenerating ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin-slow 2s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Generating Certificate...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Certificate
          </>
        )}
      </button>
    </>
  );
}
