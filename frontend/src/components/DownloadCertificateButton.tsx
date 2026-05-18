import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { publicAsset } from '../lib/assets';

interface DownloadCertificateButtonProps {
  fullName: string;
  userId?: string;
}

// Hardcoded verified configuration from the admin calibrator
const CONFIG = {
  nameMask: { x: 24, y: 48, w: 51, h: 10, color: "rgb(255, 248, 236)" },
  nameText: { x: 50, y: 55, fontSize: 36, color: "#152446", font: "Playfair Display, serif", align: "center" },
  sigMaskTop: { x: 30, y: 73, w: 40, h: 8, color: "rgb(255, 248, 236)" },
  sigMaskBottom: { x: 27, y: 84, w: 45, h: 10, color: "rgb(255, 248, 236)" },
  sigImage: { x: 38, y: 74, w: 25, h: 8 },
  sigTextLine1: { x: 49, y: 88, fontSize: 18, color: "#152446", font: "Playfair Display, serif", isBold: true, align: "center" },
  sigTextLine2: { x: 49, y: 92, fontSize: 18, color: "#152446", font: "Playfair Display, serif", isBold: false, align: "center" }
};

export function DownloadCertificateButton({ fullName, userId }: DownloadCertificateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // The public URL where anyone can scan and verify the certificate
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const verificationUrl = userId 
    ? `${window.location.origin}${baseUrl}/verify/${userId}`
    : `${window.location.origin}${baseUrl}`;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 1. Load Base Certificate
      const baseImg = new Image();
      baseImg.crossOrigin = "anonymous";
      baseImg.src = publicAsset("Certificate.png");
      await new Promise((resolve, reject) => {
        baseImg.onload = resolve;
        baseImg.onerror = reject;
      });

      // 2. Load Signature
      const sigImg = new Image();
      sigImg.crossOrigin = "anonymous";
      sigImg.src = publicAsset("Signature.png");
      await new Promise((resolve, reject) => {
        sigImg.onload = resolve;
        sigImg.onerror = reject;
      });

      // 3. Prepare Canvas
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not available");
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context not available");

      canvas.width = baseImg.width;
      canvas.height = baseImg.height;

      // Helper
      const getX = (pct: number) => (pct / 100) * canvas.width;
      const getY = (pct: number) => (pct / 100) * canvas.height;

      // 4. Draw Base Image
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

      // 4.5. Draw Masks
      ctx.fillStyle = CONFIG.nameMask.color;
      ctx.fillRect(getX(CONFIG.nameMask.x), getY(CONFIG.nameMask.y), getX(CONFIG.nameMask.w), getY(CONFIG.nameMask.h));

      ctx.fillStyle = CONFIG.sigMaskTop.color;
      ctx.fillRect(getX(CONFIG.sigMaskTop.x), getY(CONFIG.sigMaskTop.y), getX(CONFIG.sigMaskTop.w), getY(CONFIG.sigMaskTop.h));

      ctx.fillStyle = CONFIG.sigMaskBottom.color;
      ctx.fillRect(getX(CONFIG.sigMaskBottom.x), getY(CONFIG.sigMaskBottom.y), getX(CONFIG.sigMaskBottom.w), getY(CONFIG.sigMaskBottom.h));

      // 5. Draw Participant Name
      ctx.font = `600 ${CONFIG.nameText.fontSize * (canvas.width / 1000)}px ${CONFIG.nameText.font}`;
      ctx.fillStyle = CONFIG.nameText.color;
      ctx.textAlign = CONFIG.nameText.align as CanvasTextAlign;
      ctx.fillText(fullName, getX(CONFIG.nameText.x), getY(CONFIG.nameText.y));

      // 6. Draw Signature Image
      ctx.drawImage(sigImg, getX(CONFIG.sigImage.x), getY(CONFIG.sigImage.y), getX(CONFIG.sigImage.w), getY(CONFIG.sigImage.h));

      // 7. Draw Signature Line 1
      const sizeL1 = CONFIG.sigTextLine1.fontSize * (canvas.width / 1000);
      ctx.font = `${CONFIG.sigTextLine1.isBold ? 'bold' : 'normal'} ${sizeL1}px ${CONFIG.sigTextLine1.font}`;
      ctx.fillStyle = CONFIG.sigTextLine1.color;
      ctx.textAlign = CONFIG.sigTextLine1.align as CanvasTextAlign;
      ctx.fillText("S. Sendhil Kumar, Founder", getX(CONFIG.sigTextLine1.x), getY(CONFIG.sigTextLine1.y));

      // 8. Draw Signature Line 2
      const sizeL2 = CONFIG.sigTextLine2.fontSize * (canvas.width / 1000);
      ctx.font = `${CONFIG.sigTextLine2.isBold ? 'bold' : 'normal'} ${sizeL2}px ${CONFIG.sigTextLine2.font}`;
      ctx.fillStyle = CONFIG.sigTextLine2.color;
      ctx.textAlign = CONFIG.sigTextLine2.align as CanvasTextAlign;
      ctx.fillText("Global Knowledge Technologies", getX(CONFIG.sigTextLine2.x), getY(CONFIG.sigTextLine2.y));

      // 8.5 Draw QR Code in bottom left
      if (qrRef.current) {
        // Define QR code position and size (bottom left corner)
        const qrSize = getX(11); // 10% of canvas width
        const qrX = getX(9); // 5% padding from left
        const qrY = canvas.height - qrSize - getY(8); // 5% padding from bottom
        
        ctx.drawImage(qrRef.current, qrX, qrY, qrSize, qrSize);
        
      }

      // 9. Trigger Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Certificate_${fullName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to generate certificate:", error);
      alert("Failed to generate the certificate. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ display: 'none' }}>
        <QRCodeCanvas 
          value={verificationUrl}
          size={256}
          level={"H"}
          includeMargin={true}
          ref={qrRef}
        />
      </div>
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
