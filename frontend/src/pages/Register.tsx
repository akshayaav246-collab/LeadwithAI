import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { Autocomplete } from '@/components/Autocomplete';
import { toast } from 'sonner';
import { publicAsset } from '@/lib/assets';

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
  const { login, token, user, updateUser } = useAuth();
  const [location, navigate] = useLocation();


  // Read referral code from URL or persistent storage
  const urlParams = new URLSearchParams(window.location.search);
  // Read referral code only from global storage (set by landing page)
  const refCode = localStorage.getItem('referralCode') || '';

  useEffect(() => {
    // If someone tries to use a ref link directly on the register page,
    // bounce them to the landing page so they see the full event details
    // and the global tracker can catch it.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('ref')) {
      const ref = urlParams.get('ref');
      window.location.href = `/?ref=${ref}`;
    }

    api.getPublicSettings()
      .then(settings => {
        if (settings && settings.availableCohorts) {
          setAvailableCohorts(settings.availableCohorts);
        }
      })
      .catch(err => {
        console.error('Failed to load available cohorts:', err);
      });
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return window.location.pathname.endsWith('/login') ? 'login' : 'register';
  });

  // Synchronize activeTab state when URL location changes
  useEffect(() => {
    const expectedTab = location.endsWith('/login') ? 'login' : 'register';
    if (activeTab !== expectedTab) {
      setActiveTab(expectedTab);
      setErrors({});
    }
  }, [location]);

  // ── Register form state ──────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('India');
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
  const [selectedCohort, setSelectedCohort] = useState('June 13 & 14, 2026');
  const [availableCohorts, setAvailableCohorts] = useState<string[]>([]);

  // Nepal payment proof state
  const [nepalTxnRef, setNepalTxnRef] = useState('');
  const [nepalScreenshot, setNepalScreenshot] = useState<File | null>(null);
  const [isSubmittingNepalProof, setIsSubmittingNepalProof] = useState(false);
  const [nepalProofSubmitted, setNepalProofSubmitted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearError = (field: string) => setErrors(prev => ({ ...prev, [field]: '' }));

  // ── ID verification verdict state ───────────────────────
  const [idVerdict, setIdVerdict] = useState<'APPROVED' | 'REJECTED' | 'REVIEW' | 'TRAFFIC_ERROR' | null>(null);
  const [idRejectionReason, setIdRejectionReason] = useState('');
  const [showIdModal, setShowIdModal] = useState(false);

  function closeIdModal() { setShowIdModal(false); }
  function resetIdUpload() {
    setIdFile(null);
    setIdVerdict(null);
    setIdRejectionReason('');
    setShowIdModal(false);
    setCollegeName('');
    setCourse('');
    setYear('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }



  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [regToken, setRegToken] = useState('');

  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtp, setRegOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [heardFrom, setHeardFrom] = useState('');
  const [heardFromOther, setHeardFromOther] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived: true when the student's email is from an institutional domain
  const isInstitutionalEmail =
    userType === 'student' && /\.(ac|edu)\.in$/i.test(email.trim());

  const scanIdCard = async (file: File) => {
    if (!file || isInstitutionalEmail || country === 'Nepal') return;
    setIsScanningId(true);
    setIdVerdict(null);
    setIdRejectionReason('');
    try {
      const parsed = await api.parseIdCard(file, email || undefined);
      setIdVerdict(parsed.verdict);
      if (parsed.verdict === 'APPROVED') {
        setIdRejectionReason('');
      } else if (parsed.verdict === 'REJECTED') {
        setIdRejectionReason(parsed.rejection_reason || 'The ID card is not found to be valid.');
      } else if (parsed.verdict === 'TRAFFIC_ERROR') {
        setIdRejectionReason(parsed.rejection_reason || 'Gemini server is experiencing high traffic. Please try again.');
      } else {
        setIdRejectionReason('');
      }
    } catch (err: any) {
      console.error('ID Parse Error:', err);
      setIdVerdict('REVIEW');
      setIdRejectionReason('');
    } finally {
      setIsScanningId(false);
    }
  };

  // ── Login form state ─────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [loginLoading, setLoginLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (token && user && !regSuccess) {
      navigate('/profile');
    }
  }, [token, user, navigate, regSuccess]);

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
        theme: { color: '#3B8BD4' },
        handler: async (response: any) => {
          try {
            await api.verifyPayment(token, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const { user: freshUser } = await api.getMe(token);
            updateUser(freshUser);
            setPaymentDone(true);
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment was cancelled. You can try again from your profile.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment.');
    }
  }

  const verifyStepCompleted = (field: 'phone' | 'email') => {
    if (!fullName.trim()) {
      toast.warning('Please enter your full name first.');
      return false;
    }
    if (field === 'email') {
      if (!phone.trim()) {
        toast.warning('Please enter your phone number first.');
        return false;
      }
      const hasInvalidChars = /[^\d+\s()-]/.test(phone);
      const cleaned = phone.replace(/[^\d+]/g, '');
      const phoneRegex = /^\+?[1-9]\d{6,14}$/;
      if (hasInvalidChars || !phoneRegex.test(cleaned)) {
        toast.warning('Please enter a valid phone number first (e.g. +91 98765 43210).');
        return false;
      }
    }
    return true;
  };

  const checkEmailVerification = () => {
    if (!isEmailVerified) {
      toast.warning('Please verify your email address first.');
      return true;
    }
    return false;
  };

  const handleOtherFieldFocus = (e: React.FocusEvent<any>) => {
    if (checkEmailVerification()) {
      e.currentTarget.blur();
    }
  };

  const handleToggleUserType = (type: UserType) => {
    if (checkEmailVerification()) return;
    setUserType(type);
  };

  // ─────────────────────────────────────────────────────────────
  // REGISTER OTP
  // ─────────────────────────────────────────────────────────────
  const handleSendRegOtp = async () => {
    setErrors({});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email before sending OTP.');
      return;
    }
    setVerifyLoading(true);
    try {
      await api.sendRegisterOtp(email, userType);
      setRegOtpSent(true);
      toast.success('OTP sent please check your mail');
    } catch (err: any) {
      let msg = err.message || 'Failed to send OTP.';
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('not found')) {
        msg = 'Email address could not be found or is invalid.';
      }
      toast.error(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleVerifyRegOtp = async () => {
    setErrors({});
    if (!regOtp || regOtp.length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }
    setVerifyLoading(true);
    try {
      await api.verifyRegisterOtp(email, regOtp);
      setIsEmailVerified(true);
      toast.success('Email verified successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP.');
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

    if (!isEmailVerified) newErrors.email = 'Verify the email';

    // Validation
    if (!fullName.trim()) newErrors.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email.';
    const hasInvalidPhoneChars = /[^\d+\s()-]/.test(phone);
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (hasInvalidPhoneChars || !phoneRegex.test(cleanedPhone)) newErrors.phone = 'Please enter a valid phone number (e.g. +91 98765 43210).';
    
    if (userType === 'student') {
      // ID card is mandatory for all students except from Nepal
      if (!idFile) {
        newErrors.idCard = 'Please upload your College ID Card.';
      } else if (country !== 'Nepal') {
        if (!isInstitutionalEmail && idVerdict === 'REJECTED') {
          // LLM validation result only blocks non-institutional users
          newErrors.idCard = idRejectionReason || 'The ID card could not be verified. Please upload a valid physical ID.';
        } else if (!isInstitutionalEmail && idVerdict === 'TRAFFIC_ERROR') {
          newErrors.idCard = idRejectionReason || 'Gemini server is experiencing high traffic. Please try again.';
        } else if (!isInstitutionalEmail && isScanningId) {
          newErrors.idCard = 'Please wait — your ID card is being validated.';
        }
      }
      if (!collegeName.trim()) newErrors.collegeName = 'Please enter your college name.';
      if (!course.trim()) newErrors.course = 'Please enter your course.';
      if (!year) newErrors.year = 'Please select your year.';
    } else {
      if (!domain.trim()) newErrors.domain = 'Please select your domain/field.';
    }
    
    if (!selectedCohort) {
      newErrors.selectedCohort = 'Please select your preferred date.';
    }

    if (!heardFrom) {
      newErrors.heardFrom = 'Please let us know how you heard about this.';
    } else if (heardFrom === 'Others' && !heardFromOther.trim()) {
      newErrors.heardFromOther = 'Please specify how you heard about this.';
    }

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
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

      const finalHeardFrom = heardFrom === 'Others' ? heardFromOther.trim() : heardFrom;
      formData.append('heardFrom', finalHeardFrom);
      formData.append('selectedCohort', selectedCohort);
      
      formData.append('country', country);
      if (refCode) {
        formData.append('referralCode', refCode);
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
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // NEPAL PAYMENT PROOF SUBMIT
  // ─────────────────────────────────────────────────────────────
  const handleNepalProofSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nepalTxnRef.trim()) {
      toast.error('Please enter the Transaction Reference ID (UTR).');
      return;
    }
    setIsSubmittingNepalProof(true);
    try {
      await api.submitNepalProof(regToken, nepalTxnRef.trim());
      setNepalProofSubmitted(true);
      toast.success('Payment details submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment details.');
    } finally {
      setIsSubmittingNepalProof(false);
    }
  };


  // ─────────────────────────────────────────────────────────────
  // SEND OTP
  // ─────────────────────────────────────────────────────────────
  const handleSendOtp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoginLoading(true);
    try {
      await api.sendOtp(loginEmail.trim().toLowerCase());
      setOtpSent(true);
      setOtpStep('otp');
      toast.success('OTP sent please check your mail');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP.');
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
    if (!otp.trim() || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP.');
      return;
    }
    setLoginLoading(true);
    try {
      const { token, user } = await api.verifyOtp(loginEmail, otp);
      login(token, user);
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ══ ID Verification Rejection Modal ══════════════════════ */}
      {showIdModal && (
        <div className="id-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="id-modal-title">
          <div className="id-modal-card">
            <div className="id-modal-title" id="id-modal-title">ID Verification Failed</div>
            <div className="id-modal-body">{idRejectionReason}</div>
            <div className="id-modal-hint">
              If you are a working professional or from an organisation, please switch to the
              &ldquo;Working Professional / Others&rdquo; option instead.
            </div>
            <div className="id-modal-actions">
              <button className="id-modal-btn-primary" type="button" onClick={resetIdUpload}>
                Upload Another ID
              </button>
              <button
                className="id-modal-btn-secondary"
                type="button"
                onClick={() => { closeIdModal(); setUserType('working'); }}
              >
                Switch to Professional
              </button>
            </div>
          </div>
        </div>
      )}
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
            {!regSuccess && !paymentDone && (
              <div className="reg-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === 'register'}
                  className={`reg-tab ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => { navigate('/register'); }}
                >
                  Register
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'login'}
                  className={`reg-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => { navigate('/login'); }}
                >
                  Login
                </button>
              </div>
            )}

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
                    <p style={{ marginTop: '0.5rem', fontSize: '0.95rem', color: '#166534', fontWeight: 600 }}>
                      Workshop details will be shared shortly through mail
                    </p>
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
                  /* ── Registered — payment pending ── */
                  <div className="register-success" role="status">
                    {country === 'Nepal' ? (
                      nepalProofSubmitted ? (
                        <>
                          <div className="register-success-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <h3>Profile Created Successfully!</h3>
                          <p><strong>Your registration is currently pending admin verification. We will send you a confirmation email once approved.</strong></p>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ marginTop: '1.5rem', width: '100%' }}
                            onClick={() => navigate('/profile')}
                          >
                            Go to My Profile →
                          </button>
                        </>
                      ) : (
                        <form onSubmit={handleNepalProofSubmit} style={{ width: '100%' }}>
                          <h3>Profile Registration Completed</h3>
                          <p style={{ marginBottom: '1.5rem' }}><strong>Please scan the QR code below using your UPI app and pay <span style={{ fontFamily: 'system-ui, sans-serif' }}>{userType === 'student' ? '₹499' : '₹999'}</span>. Once done, enter the transaction ID.</strong></p>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <img 
                              src={publicAsset("Qr_code_Nepal.png")} 
                              alt="Nepal UPI QR Code" 
                              style={{ maxWidth: '240px', border: '2px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const placeholder = parent.querySelector('.qr-placeholder');
                                  if (!placeholder) {
                                    const newPlaceholder = document.createElement('div');
                                    newPlaceholder.className = 'qr-placeholder';
                                    newPlaceholder.style.width = '240px';
                                    newPlaceholder.style.height = '240px';
                                    newPlaceholder.style.display = 'flex';
                                    newPlaceholder.style.alignItems = 'center';
                                    newPlaceholder.style.justifyContent = 'center';
                                    newPlaceholder.style.border = '2px dashed #CBD5E1';
                                    newPlaceholder.style.borderRadius = '12px';
                                    newPlaceholder.style.background = '#F8FAFC';
                                    newPlaceholder.style.color = '#64748B';
                                    newPlaceholder.style.fontSize = '0.85rem';
                                    newPlaceholder.style.fontWeight = '500';
                                    newPlaceholder.style.textAlign = 'center';
                                    newPlaceholder.style.padding = '1rem';
                                    newPlaceholder.innerText = 'QR Code Image (Qr_code_Nepal.png) not found. Please upload to frontend/public/ folder.';
                                    parent.insertBefore(newPlaceholder, parent.firstChild);
                                  }
                                }
                              }}
                            />
                          </div>

                          <div className="register-field" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                            <label htmlFor="nepal-txn-ref" style={{ fontWeight: 600 }}>Transaction ID (UTR Code) *</label>
                            <input
                              id="nepal-txn-ref"
                              type="text"
                              value={nepalTxnRef}
                              onChange={(e) => setNepalTxnRef(e.target.value)}
                              placeholder="Enter transaction reference ID"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="btn-primary"
                            style={{ width: '100%' }}
                            disabled={isSubmittingNepalProof}
                          >
                            {isSubmittingNepalProof ? 'Submitting...' : 'Submit Payment Details →'}
                          </button>

                        </form>
                      )
                    ) : (
                      <>
                        <div className="register-success-icon" style={{ background: 'rgba(196,149,106,0.12)', color: 'var(--color-sienna)' }} aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <h3>Registration completed</h3>
                        <p><strong>Please complete the <span style={{ fontFamily: 'system-ui, sans-serif' }}>{userType === 'student' ? '₹499' : '₹999'}</span> payment to confirm your seat.</strong></p>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ marginTop: '1.5rem', width: '100%' }}
                          onClick={() => launchRazorpay(regToken, {})}
                        >
                          Pay <span style={{ fontFamily: 'system-ui, sans-serif' }}>{userType === 'student' ? '₹499' : '₹999'}</span> Now →
                        </button>
                      </>
                    )}
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
                      </div>
                      <div className="register-field">
                        <label htmlFor="reg-phone">Phone Number *</label>
                        <input
                          id="reg-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            if (!verifyStepCompleted('phone')) return;
                            setPhone(e.target.value.replace(/[^\d+\s()-]/g, ''));
                            clearError('phone');
                          }}
                          onFocus={(e) => {
                            if (!verifyStepCompleted('phone')) {
                              e.currentTarget.blur();
                            }
                          }}
                          placeholder="+91 98765 43210"
                          autoComplete="tel"
                          maxLength={25}
                          required
                        />
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
                              if (!verifyStepCompleted('email')) return;
                              setEmail(e.target.value);
                              setIsEmailVerified(false);
                              setRegOtpSent(false);
                              setRegOtp('');
                              clearError('email');
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                                toast.error('Please enter a valid email.');
                              }
                            }}
                            onFocus={(e) => {
                              if (!verifyStepCompleted('email')) {
                                e.currentTarget.blur();
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
                            onClick={() => {
                              if (!verifyStepCompleted('email')) return;
                              handleSendRegOtp();
                            }}
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
                      
                      {/* Friendly email hint */}
                      <div className="field-hint email-hint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Students - If you have a college domain email , use it.Otherwise use your personal email.
                      </div>
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

                    {/* Guarded fields after email verification */}
                    <div style={{ position: 'relative' }}>
                      {!isEmailVerified && (
                        <div
                          onClick={() => {
                            toast.warning('Please verify your email address first.');
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            cursor: 'not-allowed',
                          }}
                        />
                      )}
                      
                      <div 
                        style={{ 
                          opacity: isEmailVerified ? 1 : 0.6, 
                          pointerEvents: isEmailVerified ? 'auto' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1.4rem'
                        }}
                      >
                        {/* Country Selection */}
                        <div className="register-field">
                          <label htmlFor="reg-country">Country *</label>
                          <select
                            id="reg-country"
                            value={country}
                            onChange={(e) => {
                              const selectedVal = e.target.value;
                              setCountry(selectedVal);
                              if (selectedVal === 'Nepal') {
                                setIdVerdict(null);
                                setIdRejectionReason('');
                              }
                            }}
                            className="register-select"
                            disabled={!isEmailVerified}
                            required
                          >
                            <option value="India">India</option>
                            <option value="Nepal">Nepal</option>
                          </select>
                        </div>

                        {/* Student / Working Toggle */}
                        <div className="register-field">
                          <label>I am a *</label>
                          <div className="reg-toggle">
                            <button
                              type="button"
                              className={`reg-toggle-btn ${userType === 'student' ? 'active' : ''}`}
                              onClick={() => handleToggleUserType('student')}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                              disabled={!isEmailVerified}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.34a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.832l8.57 3.698a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
                              Student
                            </button>
                            <button
                              type="button"
                              className={`reg-toggle-btn ${userType === 'working' ? 'active' : ''}`}
                              onClick={() => handleToggleUserType('working')}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                              disabled={!isEmailVerified}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                              Working Professional/Others
                            </button>
                          </div>
                        </div>

                        {/* Student-specific fields */}
                        {userType === 'student' && (
                          <div className="reg-conditional-fields">
                            <div className="register-field">
                                <label htmlFor="reg-idcard">
                                  college id card *(Both sides)
                                  {isScanningId && (
                                    <span style={{ marginLeft: '10px', fontSize: '0.85em', color: 'var(--color-sienna)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                      Validating...
                                    </span>
                                  )}
                                </label>

                                {!isInstitutionalEmail && (
                                  <p className="email-hint" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--color-stone)' }}>
                                    Please upload your physical College ID card to qualify for student pricing (₹499).
                                  </p>
                                )}

                                <div
                                  className={`register-upload ${idFile ? 'has-file' : ''} ${isScanningId ? 'scanning' : ''}`}
                                  onClick={() => {
                                    if (checkEmailVerification()) return;
                                    if (!isScanningId) fileInputRef.current?.click();
                                  }}
                                  style={{ cursor: isScanningId ? 'not-allowed' : 'pointer', opacity: isScanningId ? 0.7 : 1 }}
                                >
                                  <input
                                    ref={fileInputRef}
                                    id="reg-idcard"
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    disabled={!isEmailVerified}
                                    onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                                      const f = e.target.files?.[0] || null;
                                      setIdFile(f);
                                      if (f) clearError('idCard');
                                      setIdVerdict(null);
                                      setIdRejectionReason('');
                                      setShowIdModal(false);

                                      // LLM validation only for non-institutional emails, skip for Nepal
                                      if (f && !isInstitutionalEmail && country !== 'Nepal') {
                                        await scanIdCard(f);
                                      }
                                    }}
                                  />
                                  {idFile ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                      <span className="upload-filename" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {idVerdict === 'TRAFFIC_ERROR' ? (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        ) : (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                        )}
                                        {idFile.name}
                                      </span>
                                      {idVerdict === 'TRAFFIC_ERROR' && (
                                        <button
                                          type="button"
                                          style={{
                                            background: '#fef3c7',
                                            color: '#d97706',
                                            border: '1px solid #fcd34d',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (idFile) scanIdCard(idFile);
                                          }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                          Reload / Retry
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="upload-placeholder">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                      PDF only(max. 5MB)
                                    </span>
                                  )}
                                </div>

                                {/* Inline validation feedback for non-institutional */}
                                {!isInstitutionalEmail && idFile && !isScanningId && (
                                  <>
                                    {idVerdict === 'APPROVED' && (
                                      <div className="id-verdict-line">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>The ID is found to be valid.</span>
                                      </div>
                                    )}
                                    {idVerdict === 'TRAFFIC_ERROR' && (
                                      <div className="id-rejected-block">
                                        <div className="id-verdict-line" style={{ color: '#d97706' }}>
                                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                          <span>Gemini server is experiencing high traffic. Please try again.</span>
                                        </div>
                                      </div>
                                    )}
                                    {idVerdict === 'REJECTED' && (
                                      <div className="id-rejected-block">
                                        <div className="id-verdict-line">
                                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                          <span>ID Verification Failed.</span>
                                        </div>
                                        <div className="id-rejected-hint" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                          <span>If you are working professional register under </span>
                                          <button
                                            type="button"
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: 0,
                                              margin: 0,
                                              font: 'inherit',
                                              color: '#2563eb',
                                              fontWeight: 'bold',
                                              textDecoration: 'underline',
                                              cursor: 'pointer',
                                              display: 'inline',
                                            }}
                                            onClick={() => { setUserType('working'); resetIdUpload(); }}
                                            disabled={!isEmailVerified}
                                          >
                                            Working professional/others
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                            <div className="register-grid-2">
                              <div className="register-field">
                                <label htmlFor="reg-college">College Name *</label>
                                <input
                                  id="reg-college"
                                  type="text"
                                  value={collegeName}
                                  onChange={(e) => { setCollegeName(e.target.value); clearError('collegeName'); }}
                                  onFocus={handleOtherFieldFocus}
                                  placeholder="e.g. PSG College of Technology"
                                  disabled={!isEmailVerified}
                                  required
                                />
                              </div>
                              <div className="register-field">
                                <label htmlFor="reg-course">Course *</label>
                                <input
                                  id="reg-course"
                                  type="text"
                                  value={course}
                                  onChange={(e) => { setCourse(e.target.value); clearError('course'); }}
                                  onFocus={handleOtherFieldFocus}
                                  placeholder="e.g. B.Tech CSE"
                                  disabled={!isEmailVerified}
                                  required
                                />
                              </div>
                            </div>
                            <div className="register-field">
                              <label htmlFor="reg-year">Year *</label>
                              <select
                                id="reg-year"
                                value={year}
                                onChange={(e) => { setYear(e.target.value); clearError('year'); }}
                                onFocus={handleOtherFieldFocus}
                                className="register-select"
                                disabled={!isEmailVerified}
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
                            </div>
                          </div>
                        )}

                        {/* Working professional fields */}
                        {userType === 'working' && (
                          <div className="reg-conditional-fields">
                            <div className="register-grid-2">
                              <div className="register-field">
                                <label htmlFor="reg-domain">Domain</label>
                                <select
                                  id="reg-domain"
                                  value={domain}
                                  onChange={(e) => { setDomain(e.target.value); clearError('domain'); }}
                                  onFocus={handleOtherFieldFocus}
                                  className="register-select"
                                  disabled={!isEmailVerified}
                                  required
                                >
                                  <option value="">Select your industry</option>
                                  {DOMAIN_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="register-field">
                                <label htmlFor="reg-org">Organization</label>
                                <input
                                  id="reg-org"
                                  type="text"
                                  value={organization}
                                  onChange={(e) => setOrganization(e.target.value)}
                                  onFocus={handleOtherFieldFocus}
                                  placeholder="e.g. Tata Consultancy Services"
                                  disabled={!isEmailVerified}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Preferred Weekend Cohort */}


                        {/* How did you hear about us? */}
                        <div className="register-field">
                          <label htmlFor="reg-heardFrom">How did you hear about us? *</label>
                          <select
                            id="reg-heardFrom"
                            value={heardFrom}
                            onChange={(e) => { setHeardFrom(e.target.value); clearError('heardFrom'); }}
                            onFocus={handleOtherFieldFocus}
                            className="register-select"
                            disabled={!isEmailVerified}
                            required
                          >
                            <option value="">Select an option</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Newspaper">Newspaper</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>

                        {heardFrom === 'Others' && (
                          <div className="register-field" style={{ marginTop: '1rem' }}>
                            <label htmlFor="reg-heardFromOther">Please specify *</label>
                            <input
                              id="reg-heardFromOther"
                              type="text"
                              value={heardFromOther}
                              onChange={(e) => { setHeardFromOther(e.target.value); clearError('heardFromOther'); }}
                              onFocus={handleOtherFieldFocus}
                              placeholder="e.g. Friend, Professor, etc."
                              disabled={!isEmailVerified}
                              required
                            />
                          </div>
                        )}

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
                            <>Register &amp; Enroll Now → <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.85 }}>(Pay <span style={{ fontFamily: 'system-ui, sans-serif' }}>{userType === 'student' ? '₹499' : '₹999'}</span>)</span></>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="register-note">
                      Already registered?{' '}
                      <button type="button" className="register-link register-link-btn" onClick={() => navigate('/login')}>
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
                    </div>

                    <button type="submit" className="btn-primary register-submit" disabled={loginLoading}>
                      {loginLoading ? (
                        <span className="btn-loading">
                          <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                        </span>
                      ) : 'Send OTP →'}
                    </button>

                    <p className="register-note">
                      Don't have an account?{' '}
                      <button type="button" className="register-link register-link-btn" onClick={() => navigate('/register')}>
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
                    </div>

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
