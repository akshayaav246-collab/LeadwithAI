import React, { useEffect, useRef, useState } from 'react';
import { publicAsset } from '../../lib/assets';

interface CertificateGeneratorProps {
  user: {
    fullName: string;
  };
  onClose: () => void;
}

// Default initial calibration config (Admin can tweak this)
const DEFAULT_CONFIG = {
  nameMask: {
    x: 24,
    y: 48,
    w: 51,
    h: 10,
    color: "rgb(255, 248, 236)"
  },
  nameText: {
    x: 50,
    y: 55,
    fontSize: 36,
    color: "#152446",
    font: "Playfair Display, serif",
    align: "center"
  },
  sigMaskTop: {
    x: 30,
    y: 73,
    w: 40,
    h: 8,
    color: "rgb(255, 248, 236)"
  },
  sigMaskBottom: {
    x: 27,
    y: 84,
    w: 45,
    h: 10,
    color: "rgb(255, 248, 236)"
  },
  sigTextLine1: {
    x: 49,
    y: 88,
    fontSize: 18,
    color: "#152446",
    font: "Playfair Display, serif",
    isBold: true,
    align: "center"
  },
  sigTextLine2: {
    x: 49,
    y: 92,
    fontSize: 18,
    color: "#152446",
    font: "Playfair Display, serif",
    isBold: false,
    align: "center"
  },
  sigImage: {
    x: 38,
    y: 74,
    w: 25,
    h: 8
  }
};

export function CertificateGenerator({ user, onClose }: CertificateGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [signatureImage, setSignatureImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    // Load Base Certificate
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = publicAsset("Certificate.png");
    img.onload = () => {
      setBaseImage(img);
      setImageLoaded(true);
    };

    // Load Signature Image
    const sigImg = new Image();
    sigImg.crossOrigin = "anonymous";
    sigImg.src = publicAsset("Signature.png");
    sigImg.onload = () => {
      setSignatureImage(sigImg);
    };
  }, []);

  useEffect(() => {
    if (imageLoaded && baseImage && canvasRef.current) {
      drawCertificate();
    }
  }, [imageLoaded, baseImage, signatureImage, config, user]);

  const drawCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image resolution
    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    // Draw base image
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    // Helper to get pixel values from percentages
    const getX = (pct: number) => (pct / 100) * canvas.width;
    const getY = (pct: number) => (pct / 100) * canvas.height;

    // 1. Mask Participant Name
    ctx.fillStyle = config.nameMask.color;
    ctx.fillRect(getX(config.nameMask.x), getY(config.nameMask.y), getX(config.nameMask.w), getY(config.nameMask.h));

    // 2. Draw Participant Name
    ctx.font = `600 ${config.nameText.fontSize * (canvas.width / 1000)}px ${config.nameText.font}`;
    ctx.fillStyle = config.nameText.color;
    ctx.textAlign = config.nameText.align as CanvasTextAlign;
    ctx.fillText(user.fullName, getX(config.nameText.x), getY(config.nameText.y));

    // 3. Mask Signature Area Top (Above gold line)
    ctx.fillStyle = config.sigMaskTop.color;
    ctx.fillRect(getX(config.sigMaskTop.x), getY(config.sigMaskTop.y), getX(config.sigMaskTop.w), getY(config.sigMaskTop.h));

    // 4. Mask Signature Area Bottom (Below gold line)
    ctx.fillStyle = config.sigMaskBottom.color;
    ctx.fillRect(getX(config.sigMaskBottom.x), getY(config.sigMaskBottom.y), getX(config.sigMaskBottom.w), getY(config.sigMaskBottom.h));

    // 5. Draw Signature Image (Above gold line)
    if (signatureImage) {
      ctx.drawImage(
        signatureImage,
        getX(config.sigImage.x),
        getY(config.sigImage.y),
        getX(config.sigImage.w),
        getY(config.sigImage.h)
      );
    }

    // 6. Draw Signature Text Line 1 (Bold)
    const sizeL1 = config.sigTextLine1.fontSize * (canvas.width / 1000);
    ctx.font = `${config.sigTextLine1.isBold ? 'bold' : 'normal'} ${sizeL1}px ${config.sigTextLine1.font}`;
    ctx.fillStyle = config.sigTextLine1.color;
    ctx.textAlign = config.sigTextLine1.align as CanvasTextAlign;
    ctx.fillText("S. Sendhil Kumar, Founder", getX(config.sigTextLine1.x), getY(config.sigTextLine1.y));

    // 7. Draw Signature Text Line 2 (Normal)
    const sizeL2 = config.sigTextLine2.fontSize * (canvas.width / 1000);
    ctx.font = `${config.sigTextLine2.isBold ? 'bold' : 'normal'} ${sizeL2}px ${config.sigTextLine2.font}`;
    ctx.fillStyle = config.sigTextLine2.color;
    ctx.textAlign = config.sigTextLine2.align as CanvasTextAlign;
    ctx.fillText("Global Knowledge Technologies", getX(config.sigTextLine2.x), getY(config.sigTextLine2.y));

    if (isCalibrating) {
      // Draw red outlines around masks in calibration mode for visibility
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(getX(config.nameMask.x), getY(config.nameMask.y), getX(config.nameMask.w), getY(config.nameMask.h));
      ctx.strokeRect(getX(config.sigMaskTop.x), getY(config.sigMaskTop.y), getX(config.sigMaskTop.w), getY(config.sigMaskTop.h));
      ctx.strokeRect(getX(config.sigMaskBottom.x), getY(config.sigMaskBottom.y), getX(config.sigMaskBottom.w), getY(config.sigMaskBottom.h));
      ctx.strokeRect(getX(config.sigImage.x), getY(config.sigImage.y), getX(config.sigImage.w), getY(config.sigImage.h));
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

  const updateConfig = (section: keyof typeof config, field: string, value: string | number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof config],
        [field]: value
      }
    }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      padding: '2rem', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: '#fff', padding: '1rem', borderRadius: 8 }}>
        <h2 style={{ margin: 0 }}>Certificate Generator for {user.fullName}</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* 
          <button className="btn-secondary" onClick={() => setIsCalibrating(!isCalibrating)}>
            {isCalibrating ? 'Close Calibration' : 'Calibrate Positions'}
          </button> 
          */}
          <button className="btn-primary" onClick={handleDownload} disabled={!imageLoaded}>
            Download PNG
          </button>
          <button className="btn-secondary" onClick={onClose} style={{ border: 'none' }}>
            ✕ Close
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexGrow: 1, minHeight: 0 }}>
        {/* Canvas Area */}
        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto', background: '#222', borderRadius: 8, padding: '1rem' }}>
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

        {/* Calibration Panel */}
        {isCalibrating && (
          <div style={{ width: 350, background: '#fff', borderRadius: 8, padding: '1.5rem', overflowY: 'auto', flexShrink: 0 }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>Calibration Tool</h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Name Mask (Background color over old text)</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.nameMask.x} onChange={e => updateConfig('nameMask', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.nameMask.y} onChange={e => updateConfig('nameMask', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>W %: <input type="number" step="0.5" value={config.nameMask.w} onChange={e => updateConfig('nameMask', 'w', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>H %: <input type="number" step="0.5" value={config.nameMask.h} onChange={e => updateConfig('nameMask', 'h', parseFloat(e.target.value))} style={inputStyle} /></label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Name Text</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.nameText.x} onChange={e => updateConfig('nameText', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.nameText.y} onChange={e => updateConfig('nameText', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Size: <input type="number" value={config.nameText.fontSize} onChange={e => updateConfig('nameText', 'fontSize', parseFloat(e.target.value))} style={inputStyle} /></label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Signature Image</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.sigImage.x} onChange={e => updateConfig('sigImage', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.sigImage.y} onChange={e => updateConfig('sigImage', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>W %: <input type="number" step="0.5" value={config.sigImage.w} onChange={e => updateConfig('sigImage', 'w', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>H %: <input type="number" step="0.5" value={config.sigImage.h} onChange={e => updateConfig('sigImage', 'h', parseFloat(e.target.value))} style={inputStyle} /></label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Mask: Above Gold Line (Signature)</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.sigMaskTop.x} onChange={e => updateConfig('sigMaskTop', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.sigMaskTop.y} onChange={e => updateConfig('sigMaskTop', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>W %: <input type="number" step="0.5" value={config.sigMaskTop.w} onChange={e => updateConfig('sigMaskTop', 'w', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>H %: <input type="number" step="0.5" value={config.sigMaskTop.h} onChange={e => updateConfig('sigMaskTop', 'h', parseFloat(e.target.value))} style={inputStyle} /></label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Mask: Below Gold Line (Text)</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.sigMaskBottom.x} onChange={e => updateConfig('sigMaskBottom', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.sigMaskBottom.y} onChange={e => updateConfig('sigMaskBottom', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>W %: <input type="number" step="0.5" value={config.sigMaskBottom.w} onChange={e => updateConfig('sigMaskBottom', 'w', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>H %: <input type="number" step="0.5" value={config.sigMaskBottom.h} onChange={e => updateConfig('sigMaskBottom', 'h', parseFloat(e.target.value))} style={inputStyle} /></label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Line 1: S. Sendhil Kumar, Founder</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.sigTextLine1.x} onChange={e => updateConfig('sigTextLine1', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.sigTextLine1.y} onChange={e => updateConfig('sigTextLine1', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Size: <input type="number" value={config.sigTextLine1.fontSize} onChange={e => updateConfig('sigTextLine1', 'fontSize', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Bold: <input type="checkbox" checked={config.sigTextLine1.isBold} onChange={e => updateConfig('sigTextLine1', 'isBold', e.target.checked)} /></label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4>Line 2: Global Knowledge Technologies</h4>
              <label style={labelStyle}>X %: <input type="number" step="0.5" value={config.sigTextLine2.x} onChange={e => updateConfig('sigTextLine2', 'x', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Y %: <input type="number" step="0.5" value={config.sigTextLine2.y} onChange={e => updateConfig('sigTextLine2', 'y', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Size: <input type="number" value={config.sigTextLine2.fontSize} onChange={e => updateConfig('sigTextLine2', 'fontSize', parseFloat(e.target.value))} style={inputStyle} /></label>
              <label style={labelStyle}>Bold: <input type="checkbox" checked={config.sigTextLine2.isBold} onChange={e => updateConfig('sigTextLine2', 'isBold', e.target.checked)} /></label>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: 4 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Current Config:</p>
              <textarea 
                readOnly 
                value={JSON.stringify(config, null, 2)} 
                style={{ width: '100%', height: 150, fontSize: '0.75rem', fontFamily: 'monospace' }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.5rem',
  fontSize: '0.85rem',
  fontWeight: 600
};

const inputStyle: React.CSSProperties = {
  width: 80,
  padding: '0.2rem',
  border: '1px solid #ccc',
  borderRadius: 4
};
