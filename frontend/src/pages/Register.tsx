import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
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

  const [activeCohort, setActiveCohort] = useState('');
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [salesperson, setSalesperson] = useState('');

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
        if (settings) {
          if (settings.availableCohorts) {
            setAvailableCohorts(settings.availableCohorts);
          }
          if (settings.activeCohort) {
            setActiveCohort(settings.activeCohort);
            setSelectedCohort(settings.activeCohort);
          }
          if (settings.referralCodes) {
            const activeReferrals = settings.referralCodes
              .filter((rc: any) => rc.isActive)
              .map((rc: any) => rc.label);
            setSalespersons(activeReferrals);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load public settings:', err);
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

  // Group members state
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberIdx, setEditingMemberIdx] = useState<number | null>(null);
  const [regStep, setRegStep] = useState(1);

  // Group member form fields
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mDomain, setMDomain] = useState('');
  const [mOrg, setMOrg] = useState('');

  const openAddMemberModal = () => {
    setEditingMemberIdx(null);
    setMName('');
    setMEmail('');
    setMPhone('');
    setMDomain(domain);
    setMOrg(organization);
    setShowMemberModal(true);
  };

  const openEditMemberModal = (idx: number) => {
    setEditingMemberIdx(idx);
    const m = groupMembers[idx];
    setMName(m.fullName);
    setMEmail(m.email);
    setMPhone(m.phone);
    setMDomain(m.domain || '');
    setMOrg(m.organization || '');
    setShowMemberModal(true);
  };

  const removeMember = (idx: number) => {
    setGroupMembers(groupMembers.filter((_, i) => i !== idx));
    toast.success('Member removed.');
  };

  const handleSaveMember = async () => {
    if (!mName.trim() || !mEmail.trim() || !mPhone.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const hasInvalidPhoneChars = /[^\d+\s()-]/.test(mPhone);
    const cleanedPhone = mPhone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (hasInvalidPhoneChars || !phoneRegex.test(cleanedPhone)) {
      toast.error('Please enter a valid phone number.');
      return;
    }

    const normalizedEmail = mEmail.toLowerCase().trim();

    if (normalizedEmail === email.toLowerCase().trim()) {
      toast.error("Colleague/Friend's email cannot be the same as your registration email.");
      return;
    }

    if (userType === 'working') {
      if (!mDomain.trim()) {
        toast.error('Domain is required.');
        return;
      }
      if (!mOrg.trim()) {
        toast.error('Organization is required.');
        return;
      }
    }

    const newMember: any = {
      fullName: mName.trim(),
      email: normalizedEmail,
      phone: mPhone.trim()
    };
    if (userType === 'working') {
      newMember.domain = mDomain.trim();
      newMember.organization = mOrg.trim();
    }

    const isDuplicate = groupMembers.some((m, idx) => m.email === newMember.email && idx !== editingMemberIdx);
    if (isDuplicate) {
      toast.error('A colleague/friend with this email address has already been added.');
      return;
    }

    // Call check-email API to verify if the email is already registered in the system
    const isEditingWithSameEmail = editingMemberIdx !== null && groupMembers[editingMemberIdx].email === normalizedEmail;

    if (!isEditingWithSameEmail) {
      setIsCheckingEmail(true);
      try {
        const { exists } = await api.checkEmailExists(normalizedEmail);
        if (exists) {
          toast.error(`A user with email ${normalizedEmail} is already registered in the system.`);
          setIsCheckingEmail(false);
          return;
        }
      } catch (err) {
        console.error('Failed to verify email availability:', err);
      } finally {
        setIsCheckingEmail(false);
      }
    }

    if (editingMemberIdx !== null) {
      const updated = [...groupMembers];
      updated[editingMemberIdx] = newMember;
      setGroupMembers(updated);
      toast.success('Colleague/Friend details updated.');
    } else {
      if (groupMembers.length >= 9) {
        toast.error('You can only add up to 9 colleagues/friends.');
        return;
      }
      setGroupMembers([...groupMembers, newMember]);
      toast.success('Colleague/Friend added.');
    }

    setShowMemberModal(false);
  };

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
  const [heardFrom, setHeardFrom] = useState(refCode ? 'Referral' : '');
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
      const finalVerdict = parsed.verdict === 'TRAFFIC_ERROR' ? 'REVIEW' : parsed.verdict;
      setIdVerdict(finalVerdict);
      if (finalVerdict === 'APPROVED') {
        setIdRejectionReason('');
      } else if (finalVerdict === 'REJECTED') {
        setIdRejectionReason(parsed.rejection_reason || 'The ID card is not found to be valid.');
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
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!isEmailVerified) newErrors.email = 'Verify the email';
    if (!fullName.trim()) newErrors.fullName = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Please enter a valid email.';
    const hasInvalidPhoneChars = /[^\d+\s()-]/.test(phone);
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (hasInvalidPhoneChars || !phoneRegex.test(cleanedPhone)) {
      newErrors.phone = 'Please enter a valid phone number (e.g. +91 98765 43210).';
    }
    
    if (userType === 'student') {
      if (!idFile) {
        newErrors.idCard = 'Please upload your College ID Card.';
      } else if (country !== 'Nepal') {
        if (!isInstitutionalEmail && idVerdict === 'REJECTED') {
          newErrors.idCard = idRejectionReason || 'The ID card could not be verified. Please upload a valid physical ID.';
        } else if (!isInstitutionalEmail && isScanningId) {
          newErrors.idCard = 'Please wait — your ID card is being validated.';
        }
      }
      if (!collegeName.trim()) newErrors.collegeName = 'Please enter your college name.';
      if (!course.trim()) newErrors.course = 'Please enter your course.';
      if (!year) newErrors.year = 'Please select your year.';
    } else {
      if (!domain.trim()) newErrors.domain = 'Please select your domain/field.';
      if (!organization.trim()) newErrors.organization = 'Please enter your organization name.';
    }
    
    if (!selectedCohort) {
      newErrors.selectedCohort = 'Please select your preferred date.';
    }

    if (!refCode) {
      if (!heardFrom) {
        newErrors.heardFrom = 'Please let us know how you heard about this.';
      } else if (heardFrom === 'Others' && !heardFromOther.trim()) {
        newErrors.heardFromOther = 'Please specify how you heard about this.';
      } else if (heardFrom === 'GKT Employee' && !salesperson) {
        newErrors.salesperson = 'Please select your referral.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return false;
    }
    return true;
  };

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 1. Validate step 1 fields
    if (!validateStep1()) return;

    // 2. Validate step 2 fields if attendees are added
    if (groupMembers.length > 0) {
      for (let i = 0; i < groupMembers.length; i++) {
        const m = groupMembers[i];
        if (!m.fullName || !m.fullName.trim()) {
          toast.error(`Attendee ${i + 1}: Name is required.`);
          return;
        }
        if (!m.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) {
          toast.error(`Attendee ${i + 1}: A valid email is required.`);
          return;
        }
        if (m.email.toLowerCase().trim() === email.toLowerCase().trim()) {
          toast.error(`Attendee ${i + 1}: Email cannot be the same as the main registration email.`);
          return;
        }
        const hasInvalidPhoneChars = /[^\d+\s()-]/.test(m.phone);
        const cleanedPhone = m.phone.replace(/[^\d+]/g, '');
        const phoneRegex = /^\+?[1-9]\d{6,14}$/;
        if (hasInvalidPhoneChars || !phoneRegex.test(cleanedPhone)) {
          toast.error(`Attendee ${i + 1}: A valid phone number is required.`);
          return;
        }
      }
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
        formData.append('organization', organization.trim());
      }

      const finalHeardFrom = refCode ? 'Referral' : (heardFrom === 'Others' ? heardFromOther.trim() : heardFrom);
      formData.append('heardFrom', finalHeardFrom);
      if (!refCode && heardFrom === 'GKT Employee' && salesperson) {
        formData.append('salesperson', salesperson);
      }
      formData.append('selectedCohort', selectedCohort);
      
      formData.append('country', country);
      if (refCode) {
        formData.append('referralCode', refCode);
      }
      if (groupMembers.length > 0) {
        formData.append('groupMembers', JSON.stringify(groupMembers));
      }

      const { token, user } = await api.registerUser(formData);
      
      login(token, user);
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
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
      {showIdModal && createPortal(
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
        </div>,
        document.body
      )}
      <main>
        <section className="register-section">
          <div className="register-bg" aria-hidden="true">
            <span className="register-bg-num">01</span>
            <span className="register-bg-num two">02</span>
          </div>

          <div className={`register-wrap ${activeTab === 'login' ? 'is-login-wrap' : ''}`}>
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
                        {/* Country and UserType Selection */}
                        {regStep === 1 ? (
                          <>
                            <div className="register-grid-side">
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

                              <div className="register-field">
                                <label htmlFor="reg-usertype">I am a *</label>
                                <select
                                  id="reg-usertype"
                                  value={userType}
                                  onChange={(e) => handleToggleUserType(e.target.value as UserType)}
                                  className="register-select"
                                  disabled={!isEmailVerified}
                                  required
                                >
                                  <option value="student">Student</option>
                                  <option value="working">Working Professional</option>
                                </select>
                              </div>
                            </div>



                            {/* Student-specific fields */}
                            {userType === 'student' && (
                              <div className="reg-conditional-fields" style={{ gap: '0.65rem' }}>
                                <div className="register-grid-side">
                                  <div className="register-field">
                                    <label htmlFor="reg-idcard">
                                      college id card *(PDF)
                                      {isScanningId && (
                                        <span style={{ marginLeft: '6px', fontSize: '0.8em', color: 'var(--color-sienna)' }}>
                                          ...
                                        </span>
                                      )}
                                    </label>
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
                                          if (f && f.size > 5 * 1024 * 1024) {
                                            toast.error('File too large. Please upload a PDF under 5MB.');
                                            e.target.value = '';
                                            return;
                                          }
                                          setIdFile(f);
                                          if (f) clearError('idCard');
                                          setIdVerdict(null);
                                          setIdRejectionReason('');
                                          if (f && !isInstitutionalEmail && country !== 'Nepal') {
                                            await scanIdCard(f);
                                          }
                                        }}
                                      />
                                      {idFile ? (
                                        <span className="upload-filename" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                          ✓ {idFile.name}
                                        </span>
                                      ) : (
                                        <span className="upload-placeholder">PDF only (max 5MB)</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="register-field">
                                    <label htmlFor="reg-college">College Name *</label>
                                    <input
                                      id="reg-college"
                                      type="text"
                                      value={collegeName}
                                      onChange={(e) => { setCollegeName(e.target.value); clearError('collegeName'); }}
                                      onFocus={handleOtherFieldFocus}
                                      placeholder="e.g. College Name"
                                      disabled={!isEmailVerified}
                                      required
                                    />
                                  </div>
                                </div>

                                {/* ID Verification Verdict Feedback */}
                                {!isInstitutionalEmail && idFile && !isScanningId && (
                                  <div style={{ marginTop: '0.1rem', fontSize: '0.8rem' }}>
                                    {idVerdict === 'APPROVED' && (
                                      <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        ✓ Valid ID card.
                                      </div>
                                    )}
                                    {idVerdict === 'REJECTED' && (
                                      <div style={{ color: '#ef4444', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span>ID Verification Failed.</span>
                                        <button
                                          type="button"
                                          style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left', font: 'inherit', fontSize: '0.8rem' }}
                                          onClick={() => { setUserType('working'); resetIdUpload(); }}
                                        >
                                          Register as Working Professional instead
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="register-grid-3">
                                  <div className="register-field">
                                    <label htmlFor="reg-course">Course *</label>
                                    <input
                                      id="reg-course"
                                      type="text"
                                      value={course}
                                      onChange={(e) => { setCourse(e.target.value); clearError('course'); }}
                                      onFocus={handleOtherFieldFocus}
                                      placeholder="e.g. B.Tech"
                                      disabled={!isEmailVerified}
                                      required
                                    />
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
                                      <option value="">Year</option>
                                      <option value="1st Year">1st Yr</option>
                                      <option value="2nd Year">2nd Yr</option>
                                      <option value="3rd Year">3rd Yr</option>
                                      <option value="4th Year">4th Yr</option>
                                      <option value="5th Year">5th Yr</option>
                                      <option value="Postgraduate">PG</option>
                                    </select>
                                  </div>

                                  <div className="register-field">
                                    <label htmlFor="reg-heardFrom">Source *</label>
                                    <select
                                      id="reg-heardFrom"
                                      value={heardFrom}
                                      onChange={(e) => { setHeardFrom(e.target.value); clearError('heardFrom'); }}
                                      onFocus={handleOtherFieldFocus}
                                      className="register-select"
                                      disabled={!isEmailVerified}
                                      required
                                    >
                                      <option value="">Select</option>
                                      <option value="Social Media">Social Media</option>
                                      <option value="Newspaper">Newspaper</option>
                                      <option value="GKT Employee">GKT Employee</option>
                                      <option value="Others">Others</option>
                                    </select>
                                  </div>
                                </div>

                                {heardFrom === 'GKT Employee' && (
                                  <div className="register-field">
                                    <label htmlFor="reg-salesperson">Referral *</label>
                                    <select
                                      id="reg-salesperson"
                                      value={salesperson}
                                      onChange={(e) => { setSalesperson(e.target.value); clearError('salesperson'); }}
                                      className="register-select"
                                      disabled={!isEmailVerified}
                                      required
                                    >
                                      <option value="">Select referral</option>
                                      {salespersons.map(sp => (
                                        <option key={sp} value={sp}>{sp}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {heardFrom === 'Others' && !refCode && (
                                  <div className="register-field">
                                    <label htmlFor="reg-heardFromOther">Please specify *</label>
                                    <input
                                      id="reg-heardFromOther"
                                      type="text"
                                      value={heardFromOther}
                                      onChange={(e) => { setHeardFromOther(e.target.value); clearError('heardFromOther'); }}
                                      onFocus={handleOtherFieldFocus}
                                      placeholder="Please specify"
                                      disabled={!isEmailVerified}
                                      required
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Working professional fields */}
                            {userType === 'working' && (
                              <div className="reg-conditional-fields" style={{ gap: '0.65rem' }}>
                                <div className="register-grid-side">
                                  <div className="register-field">
                                    <label htmlFor="reg-domain">Domain *</label>
                                    <select
                                      id="reg-domain"
                                      value={domain}
                                      onChange={(e) => { setDomain(e.target.value); clearError('domain'); }}
                                      onFocus={handleOtherFieldFocus}
                                      className="register-select"
                                      disabled={!isEmailVerified}
                                      required
                                    >
                                      <option value="">Select Industry</option>
                                      {DOMAIN_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="register-field">
                                    <label htmlFor="reg-org">Organization *</label>
                                    <input
                                      id="reg-org"
                                      type="text"
                                      value={organization}
                                      onChange={(e) => setOrganization(e.target.value)}
                                      onFocus={handleOtherFieldFocus}
                                      placeholder="e.g. TCS"
                                      disabled={!isEmailVerified}
                                    />
                                  </div>
                                </div>

                                <div className={heardFrom === 'GKT Employee' ? "register-grid-side" : ""}>
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
                                      <option value="">Select option</option>
                                      <option value="Social Media">Social Media</option>
                                      <option value="Newspaper">Newspaper</option>
                                      <option value="GKT Employee">GKT Employee</option>
                                      <option value="Others">Others</option>
                                    </select>
                                  </div>

                                  {heardFrom === 'GKT Employee' && (
                                    <div className="register-field">
                                      <label htmlFor="reg-salesperson">Referral *</label>
                                      <select
                                        id="reg-salesperson"
                                        value={salesperson}
                                        onChange={(e) => { setSalesperson(e.target.value); clearError('salesperson'); }}
                                        className="register-select"
                                        disabled={!isEmailVerified}
                                        required
                                      >
                                        <option value="">Select referral</option>
                                        {salespersons.map(sp => (
                                          <option key={sp} value={sp}>{sp}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                {heardFrom === 'Others' && !refCode && (
                                  <div className="register-field">
                                    <label htmlFor="reg-heardFromOther">Please specify *</label>
                                    <input
                                      id="reg-heardFromOther"
                                      type="text"
                                      value={heardFromOther}
                                      onChange={(e) => { setHeardFromOther(e.target.value); clearError('heardFromOther'); }}
                                      onFocus={handleOtherFieldFocus}
                                      placeholder="Please specify"
                                      disabled={!isEmailVerified}
                                      required
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Stepper / Add attendees Section */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-espresso)' }}>
                                Want to add attendees?
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (groupMembers.length > 0) {
                                      setGroupMembers(groupMembers.slice(0, -1));
                                    }
                                  }}
                                  disabled={groupMembers.length === 0}
                                  style={{
                                    background: groupMembers.length === 0 ? '#cbd5e1' : '#ef4444',
                                    border: 'none',
                                    color: '#fff',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    cursor: groupMembers.length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 700,
                                    fontSize: '1.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-espresso)', minWidth: '20px', textAlign: 'center' }}>
                                  {groupMembers.length}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isEmailVerified) {
                                      toast.warning('Please verify your email address first.');
                                      return;
                                    }
                                    if (groupMembers.length >= 9) {
                                      toast.error('You can only add up to 9 colleagues/friends.');
                                      return;
                                    }
                                    setGroupMembers([...groupMembers, { fullName: '', email: '', phone: '' }]);
                                  }}
                                  style={{
                                    background: 'var(--color-sienna)',
                                    border: 'none',
                                    color: '#fff',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '1.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {groupMembers.length === 0 ? (
                              <button
                                type="submit"
                                className="btn-primary register-submit"
                                style={{ width: '100%' }}
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
                            ) : (
                              <button
                                type="button"
                                className="btn-primary register-submit"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                onClick={() => {
                                  if (validateStep1()) {
                                    setRegStep(2);
                                  }
                                }}
                              >
                                Continue to Attendees ({groupMembers.length}) →
                              </button>
                            )}
                          </>
                        ) : (
                          /* Step 2 layout */
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-espresso)', fontWeight: 700 }}>
                                Step 2: Attendee Details ({groupMembers.length} added)
                              </h4>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minHeight: 'auto', height: 'auto', lineHeight: 'normal' }}
                                onClick={() => {
                                  if (groupMembers.length >= 9) {
                                    toast.error('You can only add up to 9 colleagues/friends.');
                                    return;
                                  }
                                  setGroupMembers([...groupMembers, { fullName: '', email: '', phone: '' }]);
                                }}
                              >
                                + Add Attendee
                              </button>
                            </div>

                            <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {groupMembers.map((m, idx) => (
                                <div key={idx} className="attendee-grid-card">
                                  <div className="attendee-grid-header">
                                    <span className="attendee-grid-title">Attendee #{idx + 1}</span>
                                    {groupMembers.length > 1 && (
                                      <button
                                        type="button"
                                        className="attendee-remove-btn"
                                        onClick={() => {
                                          setGroupMembers(groupMembers.filter((_, i) => i !== idx));
                                        }}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>

                                  <div className="attendee-grid-inputs">
                                    <div className="register-field">
                                      <label>Name *</label>
                                      <input
                                        type="text"
                                        value={m.fullName || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const updated = [...groupMembers];
                                          updated[idx] = { ...updated[idx], fullName: val };
                                          setGroupMembers(updated);
                                        }}
                                        placeholder="Full Name"
                                        required
                                      />
                                    </div>

                                    <div className="register-field">
                                      <label>Email *</label>
                                      <input
                                        type="email"
                                        value={m.email || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const updated = [...groupMembers];
                                          updated[idx] = { ...updated[idx], email: val };
                                          setGroupMembers(updated);
                                        }}
                                        placeholder="Email"
                                        required
                                      />
                                    </div>

                                    <div className="register-field">
                                      <label>Phone *</label>
                                      <input
                                        type="tel"
                                        value={m.phone || ''}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^\d+\s()-]/g, '');
                                          const updated = [...groupMembers];
                                          updated[idx] = { ...updated[idx], phone: val };
                                          setGroupMembers(updated);
                                        }}
                                        placeholder="Phone"
                                        required
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Step 2 buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ flex: 1, background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}
                                onClick={() => setRegStep(1)}
                              >
                                ← Back
                              </button>
                              <button
                                type="submit"
                                className="btn-primary register-submit"
                                style={{ flex: 2, marginTop: 0 }}
                                disabled={regLoading}
                              >
                                {regLoading ? (
                                  <span className="btn-loading">
                                    <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                                  </span>
                                ) : (
                                  <>Register &amp; Enroll Now → <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.85 }}>(Pay <span style={{ fontFamily: 'system-ui, sans-serif' }}>₹{(1 + groupMembers.length) * (userType === 'student' ? 499 : 999)}</span>)</span></>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
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
              <div className="login-form-container">
                {otpStep === 'email' ? (
                  <form className="register-form login-form" onSubmit={handleSendOtp} noValidate>
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
                  <form className="register-form login-form" onSubmit={handleVerifyOtp} noValidate>
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
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
