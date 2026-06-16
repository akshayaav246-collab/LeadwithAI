import React, { useEffect, useRef, useState } from 'react';
import { publicAsset } from '../../lib/assets';
import QRCode from 'qrcode';

interface CertificateGeneratorProps {
  user: {
    id?: string;
    _id?: string;
    fullName: string;
  };
  onClose: () => void;
}

// Config matching backend coordinates exactly (3200x2200 resolution)
const CONFIG = {
  name: {
    x: 1600,             // Horizontal center
    y: 950,              // New vertical position
    fontSize: 100,       // New font size
    color: '#0a0d3d',    // New name color
    textAnchor: 'middle' // aligns center to x
  },
  qr: {
    x: 330,              // New horizontal position
    y: 1635,             // New vertical position
    size: 380            // New QR size
  }
};

export function CertificateGenerator({ user, onClose }: CertificateGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    // Load Base Certificate Template
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = publicAsset("Certificate.png");
    img.onload = () => {
      setBaseImage(img);
      setImageLoaded(true);
    };
  }, []);

  useEffect(() => {
    // Generate QR Code Image using the verify link
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    const userId = user.id || user._id || '';
    const verifyUrl = `${window.location.origin}${baseUrl}/verify/${userId}`;

    QRCode.toDataURL(verifyUrl, { width: CONFIG.qr.size, margin: 1 })
      .then(url => {
        const img = new Image();
        img.src = url;
        img.onload = () => setQrImage(img);
      })
      .catch(console.error);
  }, [user]);

  useEffect(() => {
    if (imageLoaded && baseImage && canvasRef.current) {
      drawCertificate();
    }
  }, [imageLoaded, baseImage, qrImage, user]);

  const drawCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match 3200x2200 template exactly
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    // 1. Draw base certificate template
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    // 2. Draw Participant Name (Times New Roman, Bold)
    ctx.font = `bold ${CONFIG.name.fontSize}px 'Times New Roman', Times, serif`;
    ctx.fillStyle = CONFIG.name.color;
    ctx.textAlign = (CONFIG.name.textAnchor === 'middle' ? 'center' : 'left') as CanvasTextAlign;
    ctx.fillText(user.fullName, CONFIG.name.x, CONFIG.name.y);

    // 3. Draw QR Code Image (Left side)
    if (qrImage) {
      ctx.drawImage(
        qrImage,
        CONFIG.qr.x,
        CONFIG.qr.y,
        CONFIG.qr.size,
        CONFIG.qr.size
      );
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Certificate_${user.fullName.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      padding: '2rem', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: '#fff', padding: '1rem', borderRadius: 8 }}>
        <h2 style={{ margin: 0 }}>Certificate Preview: {user.fullName}</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-primary" onClick={handleDownload} disabled={!imageLoaded}>
            Download PNG
          </button>
          <button className="btn-secondary" onClick={onClose} style={{ border: 'none' }}>
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flexGrow: 1, minHeight: 0, overflow: 'auto', background: '#222', borderRadius: 8, padding: '1rem' }}>
        {!imageLoaded && <div style={{ color: 'white' }}>Loading template...</div>}
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            maxHeight: '80vh',
            objectFit: 'contain',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            display: imageLoaded ? 'block' : 'none'
          }}
        />
      </div>
    </div>
  );
}
