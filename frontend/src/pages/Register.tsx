import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { Autocomplete } from '@/components/Autocomplete';

const COURSE_OPTIONS = [
  "B.E. Computer Science and Engineering",
  "B.E. Electronics and Communication Engineering",
  "B.E. Mechanical Engineering",
  "B.E. Civil Engineering",
  "B.E. Electrical and Electronics Engineering",
  "B.E. Information Science and Engineering",
  "B.E. Artificial Intelligence and Data Science",
  "B.E. Cyber Security",
  "B.E. Mechatronics",
  "B.E. Aeronautical Engineering",
  "B.E. Automobile Engineering",
  "B.E. Biomedical Engineering",
  "B.E. Biotechnology",
  "B.Tech Information Technology",
  "B.Tech Artificial Intelligence and Machine Learning",
  "B.Tech Data Science",
  "B.Tech Computer Science and Business Systems",
  "B.Sc Computer Science",
  "B.Sc Information Technology",
  "BCA",
  "MCA",
  "MBA",
  "B.Com",
];

const DOMAIN_OPTIONS = [
  "Information Technology (IT)",
  "Manufacturing",
  "Automobile / Automotive",
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Retail & E-commerce",
];

// ── Razorpay types ──────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

type Tab = 'register' | 'login';
type UserType = 'student' | 'working';
type OtpStep = 'email' | 'otp';

export function Register() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  // ── Tab state ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('register');

  // ── Register form state ──────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<UserType>('student');
  // Student fields
  const [collegeName, setCollegeName] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isScanningId, setIsScanningId] = useState(false);
  // Working fields
  const [domain, setDomain] = useState('');
  const [organization, setOrganization] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) => setErrors(prev => ({ ...prev, [field]: '' }));

  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [regToken, setRegToken] = useState('');

  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Login form state ─────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // RAZORPAY CHECKOUT
  // ─────────────────────────────────────────────────────────────
  async function launchRazorpay(token: string, user: any) {
    try {
      const order = await api.createOrder(token);

      // Load Razorpay script dynamically
      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
      });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Global Knowledge Technologies',
        description: 'Lead with AI — Workshop Registration',
        order_id: order.orderId,
        prefill: {
          name: order.userName,
          email: order.userEmail,
          contact: order.userPhone,
        },
        theme: { color: '#C4956A' },
        handler: async (response: any) => {
          try {
            await api.verifyPayment(token, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentDone(true);
          } catch (err: any) {
            setErrors({ global: err.message || 'Payment verification failed.' });
          }
        },
        modal: {
          ondismiss: () => {
            setErrors({ global: 'Payment was cancelled. You can try again from your profile.' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setErrors({ global: err.message || 'Failed to initiate payment.' });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REGISTER OTP
  // ─────────────────────────────────────────────────────────────
  const handleSendRegOtp = async () => {
    setErrors({});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setErrors({ email: 'Please enter a valid email before sending OTP.' });
    }
    setVerifyLoading(true);
    try {
      await api.sendRegisterOtp(email);
      setRegOtpSent(true);
    } catch (err: any) {
      let msg = err.message || 'Failed to send OTP.';
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('not found')) {
        msg = 'Email address could not be found or is invalid.';
      }
      setErrors({ email: msg });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyRegOtp = async () => {
    setErrors({});
    if (!regOtp || regOtp.length !== 6) {
      return setErrors({ otp: 'Please enter the 6-digit OTP.' });
    }
    setVerifyLoading(true);
    try {
      await api.verifyRegisterOtp(email, regOtp);
      setIsEmailVerified(true);
    } catch (err: any) {
      setErrors({ otp: err.message || 'Invalid OTP.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REGISTER SUBMIT
  // ─────────────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!isEmailVerified) newErrors.email = 'Please verify your email address before registering.';

    // Validation
    if (!fullName.trim()) newErrors.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email.';
    const phoneRegex = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) newErrors.phone = 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    
    if (userType === 'student') {
      if (!collegeName.trim()) newErrors.collegeName = 'Please enter your college name.';
      if (!course.trim()) newErrors.course = 'Please enter your course.';
      if (!year) newErrors.year = 'Please select your year.';
    } else {
      if (!domain.trim()) newErrors.domain = 'Please select your domain/field.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setRegLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone', phone.trim());
      formData.append('userType', userType);
      if (userType === 'student') {
        formData.append('collegeName', collegeName.trim());
        formData.append('course', course.trim());
        formData.append('year', year);
        if (idFile) formData.append('idCard', idFile);
      } else {
        formData.append('domain', domain.trim());
        if (organization.trim()) formData.append('organization', organization.trim());
      }

      const { token, user } = await api.registerUser(formData);
      
      // Auto-add new college to dropdown list in background
      if (userType === 'student' && collegeName) {
        api.addCollege(collegeName).catch(() => {});
      }

      login(token, user);
      setRegToken(token);
      setRegSuccess(true);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (err: any) {
      setErrors({ global: err.message || 'Registration failed. Please try again.', email: err.message.includes('User already exists') ? err.message : undefined });
    } finally {
      setRegLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SEND OTP
  // ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      return setErrors({ loginEmail: 'Please enter a valid email address.' });
    }
    setLoginLoading(true);
    try {
      await api.sendOtp(loginEmail.trim().toLowerCase());
      setOtpSent(true);
      setOtpStep('otp');
    } catch (err: any) {
      setErrors({ loginEmail: err.message || 'Failed to send OTP.' });
    } finally {
      setLoginLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VERIFY OTP
  // ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!otp.trim() || otp.length !== 6) return setErrors({ loginOtp: 'Please enter the 6-digit OTP.' });
    setLoginLoading(true);
    try {
      const { token, user } = await api.verifyOtp(loginEmail, otp);
      login(token, user);
      navigate('/profile');
    } catch (err: any) {
      setErrors({ loginOtp: err.message || 'OTP verification failed.' });
    } finally {
      setLoginLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <main>
        <section className="register-section">
          <div className="register-bg" aria-hidden="true">
            <span className="register-bg-num">01</span>
            <span className="register-bg-num two">02</span>
          </div>

          <div className="register-wrap">
            {/* ── Eyebrow ── */}
            <div className="register-eyebrow">LEAD WITH AI · 2-DAY WORKSHOP</div>
            <h1 className="register-title">
              Save your seat in the next <span className="accent-italic">Lead with AI</span> cohort.
            </h1>

            {/* ── Tabs ── */}
            <div className="reg-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'register'}
                className={`reg-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => { setActiveTab('register'); setErrors({}); }}
              >
                Register
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'login'}
                className={`reg-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => { setActiveTab('login'); setErrors({}); }}
              >
                Login
              </button>
            </div>

            {/* ══════════════════════════════════════
                REGISTER TAB
            ══════════════════════════════════════ */}
            {activeTab === 'register' && (
              <>
                {paymentDone ? (
                  /* ── Payment Success State ── */
                  <div className="register-success" role="status">
                    <div className="register-success-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h3>You're in, {fullName.split(' ')[0]}!</h3>
                    <p>Payment confirmed. A receipt has been sent to <strong>{email}</strong>.</p>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: '1.5rem' }}
                      onClick={() => navigate('/profile')}
                    >
                      View My Profile →
                    </button>
                  </div>
                ) : regSuccess ? (
                  /* ── Registered, payment pending ── */
                  <div className="register-success" role="status">
                    <div className="register-success-icon" style={{ background: 'rgba(196,149,106,0.12)', color: 'var(--color-sienna)' }} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h3>Registered! Complete Payment</h3>
                    <p>Your account has been created. Please complete the <span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>₹500</span> payment to confirm your seat.</p>
                    {errors.global && <div className="register-error" role="alert" style={{ marginTop: '1rem' }}>{errors.global}</div>}
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: '1.5rem' }}
                      onClick={() => launchRazorpay(regToken, {})}
                    >
                      Pay <span style={{ fontFamily: 'system-ui, sans-serif' }}>₹500</span> Now →
                    </button>
                  </div>
                ) : (
                  /* ── Register Form ── */
                  <form className="register-form" onSubmit={handleRegisterSubmit} noValidate encType="multipart/form-data">
                    <p className="register-sub">Share your details to reserve your spot.</p>

                    {/* Basic info row */}
                    <div className="register-grid-2">
                      <div className="register-field">
                        <label htmlFor="reg-name">Full Name *</label>
                        <input
                          id="reg-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); clearError('fullName'); }}
                          placeholder="e.g. Anjali Menon"
                          autoComplete="name"
                          required
                        />
                        {errors.fullName && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.fullName}</div>}
                      </div>
                      <div className="register-field">
                        <label htmlFor="reg-phone">Phone Number *</label>
                        <input
                          id="reg-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); clearError('phone'); }}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && !/^(?:\+91[-\s]?)?[6-9]\d{9}$/.test(val)) {
                              setErrors(prev => ({ ...prev, phone: 'Please enter a valid 10-digit mobile number.' }));
                            }
                          }}
                          placeholder="e.g. 9876543210"
                          autoComplete="tel"
                          maxLength={10}
                          required
                        />
                        {errors.phone && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.phone}</div>}
                      </div>
                    </div>

                    <div className="register-field">
                      <label htmlFor="reg-email">Email Address *</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setIsEmailVerified(false);
                              setRegOtpSent(false);
                              setRegOtp('');
                              clearError('email');
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                                setErrors(prev => ({ ...prev, email: 'Please enter a valid email.' }));
                              }
                            }}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            disabled={isEmailVerified}
                          />
                        </div>
                        {!isEmailVerified && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}
                            onClick={handleSendRegOtp}
                            disabled={verifyLoading}
                          >
                            {verifyLoading && !regOtpSent ? 'Sending...' : 'Send OTP'}
                          </button>
                        )}
                        {isEmailVerified && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#22c55e' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                      {errors.email && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.email}</div>}
                      {regOtpSent && !isEmailVerified && !errors.email && (
                        <div style={{ color: '#22c55e', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 500 }}>
                          OTP sent! Please check your email.
                        </div>
                      )}
                    </div>

                    {regOtpSent && !isEmailVerified && (
                      <div className="register-field">
                        <label htmlFor="reg-otp">Enter OTP *</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <input
                              id="reg-otp"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={regOtp}
                              onChange={(e) => { setRegOtp(e.target.value.replace(/\D/g, '')); clearError('otp'); }}
                              placeholder="6-digit OTP"
                              required
                            />
                            {errors.otp && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.otp}</div>}
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}
                            onClick={handleVerifyRegOtp}
                            disabled={verifyLoading}
                          >
                            {verifyLoading && regOtpSent ? 'Verifying...' : 'Verify Email'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Student / Working Toggle */}
                    <div className="register-field">
                      <label>I am a *</label>
                      <div className="reg-toggle">
                        <button
                          type="button"
                          className={`reg-toggle-btn ${userType === 'student' ? 'active' : ''}`}
                          onClick={() => setUserType('student')}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.34a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.832l8.57 3.698a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
                          Student
                        </button>
                        <button
                          type="button"
                          className={`reg-toggle-btn ${userType === 'working' ? 'active' : ''}`}
                          onClick={() => setUserType('working')}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                          Working Professional
                        </button>
                      </div>
                    </div>

                    {/* Student-specific fields */}
                    {userType === 'student' && (
                      <div className="reg-conditional-fields">
                        <div className="register-field" style={{ marginBottom: '1.5rem' }}>
                          <label htmlFor="reg-idcard">
                            College ID Card
                            {isScanningId && <span style={{ marginLeft: '10px', fontSize: '0.85em', color: 'var(--color-sienna)' }}>Scanning ID...</span>}
                          </label>
                          <div
                            className={`register-upload ${idFile ? 'has-file' : ''} ${isScanningId ? 'scanning' : ''}`}
                            onClick={() => !isScanningId && fileInputRef.current?.click()}
                            style={{ cursor: isScanningId ? 'not-allowed' : 'pointer', opacity: isScanningId ? 0.7 : 1 }}
                          >
                            <input
                              ref={fileInputRef}
                              id="reg-idcard"
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              style={{ display: 'none' }}
                              onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                const f = e.target.files?.[0] || null;
                                setIdFile(f);
                                if (f) {
                                  setIsScanningId(true);
                                  try {
                                    const parsed = await api.parseIdCard(f);
                                    if (parsed.college) setCollegeName(parsed.college);
                                    if (parsed.course) setCourse(parsed.course);
                                    if (parsed.year) setYear(parsed.year);
                                  } catch (err) {
                                    console.error('ID Parse Error:', err);
                                    alert('Could not extract details automatically. Please fill manually.');
                                  } finally {
                                    setIsScanningId(false);
                                  }
                                }
                              }}
                            />
                            {idFile ? (
                              <span className="upload-filename">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                {idFile.name}
                              </span>
                            ) : (
                              <span className="upload-placeholder">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Upload ID (JPG/PNG/PDF)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="register-grid-2">
                          <div className="register-field">
                            <label htmlFor="reg-college">College Name *</label>
                            <input
                              id="reg-college"
                              type="text"
                              value={collegeName}
                              onChange={(e) => { setCollegeName(e.target.value); clearError('collegeName'); }}
                              placeholder="e.g. PSG College of Technology"
                              required
                            />
                            {errors.collegeName && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.collegeName}</div>}
                          </div>
                          <div className="register-field">
                            <label htmlFor="reg-course">Course *</label>
                            <input
                              id="reg-course"
                              type="text"
                              value={course}
                              onChange={(e) => { setCourse(e.target.value); clearError('course'); }}
                              placeholder="e.g. B.Tech CSE"
                              required
                            />
                            {errors.course && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.course}</div>}
                          </div>
                        </div>
                        <div className="register-field" style={{ marginTop: '1.5rem' }}>
                          <label htmlFor="reg-year">Year *</label>
                          <select
                            id="reg-year"
                            value={year}
                            onChange={(e) => { setYear(e.target.value); clearError('year'); }}
                            className="register-select"
                            required
                          >
                            <option value="">Select year</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                            <option value="Postgraduate">Postgraduate</option>
                          </select>
                          {errors.year && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.year}</div>}
                        </div>
                      </div>
                    )}

                    {/* Working professional fields */}
                    {userType === 'working' && (
                      <div className="reg-conditional-fields">
                        <div className="register-grid-2">
                          <div className="register-field">
                            <label htmlFor="reg-domain">Domain *</label>
                            <select
                              id="reg-domain"
                              value={domain}
                              onChange={(e) => { setDomain(e.target.value); clearError('domain'); }}
                              className="register-select"
                              required
                            >
                              <option value="">Select your industry</option>
                              {DOMAIN_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            {errors.domain && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.domain}</div>}
                          </div>
                          <div className="register-field">
                            <label htmlFor="reg-org">Organization</label>
                            <input
                              id="reg-org"
                              type="text"
                              value={organization}
                              onChange={(e) => setOrganization(e.target.value)}
                              placeholder="e.g. Tata Consultancy Services"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {errors.global && <div className="register-error" role="alert">{errors.global}</div>}

                    <button
                      type="submit"
                      className="btn-primary register-submit"
                      disabled={regLoading || !isEmailVerified}
                    >
                      {regLoading ? (
                        <span className="btn-loading">
                          <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                        </span>
                      ) : (
                        <>Register &amp; Enroll Now → <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.85 }}>(Pay <span style={{ fontFamily: 'system-ui, sans-serif' }}>₹500</span>)</span></>
                      )}
                    </button>

                    <p className="register-note">
                      Already registered?{' '}
                      <button type="button" className="register-link register-link-btn" onClick={() => setActiveTab('login')}>
                        Log in here
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}

            {/* ══════════════════════════════════════
                LOGIN TAB
            ══════════════════════════════════════ */}
            {activeTab === 'login' && (
              <>
                {otpStep === 'email' ? (
                  <form className="register-form" onSubmit={handleSendOtp} noValidate>
                    <p className="register-sub">Enter your registered email to receive a one-time password.</p>

                    <div className="register-field">
                      <label htmlFor="login-email">Email Address *</label>
                      <input
                        id="login-email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => { setLoginEmail(e.target.value); clearError('loginEmail'); }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                      {errors.loginEmail && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.loginEmail}</div>}
                    </div>

                    {errors.global && <div className="register-error" role="alert">{errors.global}</div>}

                    <button type="submit" className="btn-primary register-submit" disabled={loginLoading}>
                      {loginLoading ? (
                        <span className="btn-loading">
                          <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                        </span>
                      ) : 'Send OTP →'}
                    </button>

                    <p className="register-note">
                      Don't have an account?{' '}
                      <button type="button" className="register-link register-link-btn" onClick={() => setActiveTab('register')}>
                        Register here
                      </button>
                    </p>
                  </form>
                ) : (
                  <form className="register-form" onSubmit={handleVerifyOtp} noValidate>
                    <p className="register-sub">
                      OTP sent to <strong>{loginEmail}</strong>! Please check your email.
                    </p>

                    <div className="register-field">
                      <label htmlFor="login-otp">One-Time Password *</label>
                      <input
                        id="login-otp"
                        type="text"
                        inputMode="numeric"
                        pattern="\d{6}"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); clearError('loginOtp'); }}
                        placeholder="6-digit OTP"
                        autoComplete="one-time-code"
                        required
                        className="otp-input"
                      />
                      {errors.loginOtp && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem' }}>{errors.loginOtp}</div>}
                    </div>

                    {errors.global && <div className="register-error" role="alert">{errors.global}</div>}

                    <button type="submit" className="btn-primary register-submit" disabled={loginLoading}>
                      {loginLoading ? (
                        <span className="btn-loading">
                          <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                        </span>
                      ) : 'Verify & Login →'}
                    </button>

                    <p className="register-note">
                      Didn't receive it?{' '}
                      <button
                        type="button"
                        className="register-link register-link-btn"
                        onClick={() => { setOtpStep('email'); setOtp(''); setErrors({}); }}
                      >
                        Resend OTP
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
