import { useEffect, useState, lazy, Suspense, useRef, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { useAuth, type RegisteredEvent } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';


const DOMAIN_OPTIONS = [
  "Information Technology (IT)",
  "Manufacturing",
  "Automobile / Automotive",
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Retail & E-commerce",
];

const DownloadCertificateButton = lazy(() =>
  import('@/components/DownloadCertificateButton').then(m => ({ default: m.DownloadCertificateButton }))
);

interface ProfileCompletionFormProps {
  user: any;
  token: string;
  updateUser: (user: any) => void;
  logout: () => void;
}

function ProfileCompletionForm({ user, token, updateUser, logout }: ProfileCompletionFormProps) {
  const [phone, setPhone] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<'student' | 'working'>(
    user.userType || 'student'
  );
  const [collegeName, setCollegeName] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isScanningId, setIsScanningId] = useState(false);
  const [idVerdict, setIdVerdict] = useState<'APPROVED' | 'REJECTED' | 'REVIEW' | null>(null);
  const [idRejectionReason, setIdRejectionReason] = useState('');

  const [domain, setDomain] = useState('');
  const [organization, setOrganization] = useState('');

  const [heardFrom, setHeardFrom] = useState('');
  const [heardFromOther, setHeardFromOther] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInstitutionalEmail =
    selectedUserType === 'student' && /\.(ac|edu)\.in$/i.test(user.email.trim());

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const phoneRegex = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!selectedUserType) {
      newErrors.userType = 'Please select your account type.';
    }

    if (selectedUserType === 'student') {
      if (!idFile && !user.idCardPath) {
        newErrors.idCard = 'Please upload your College ID Card.';
      } else if (!isInstitutionalEmail && idVerdict === 'REJECTED') {
        newErrors.idCard = idRejectionReason || 'The ID card could not be verified. Please upload a valid physical ID.';
      } else if (!isInstitutionalEmail && isScanningId) {
        newErrors.idCard = 'Please wait — your ID card is being validated.';
      }
      if (!collegeName.trim()) newErrors.collegeName = 'Please enter your college name.';
      if (!course.trim()) newErrors.course = 'Please enter your course.';
      if (!year) newErrors.year = 'Please select your year.';
    } else if (selectedUserType === 'working') {
      if (!domain.trim()) newErrors.domain = 'Please select your domain.';
    }

    if (!heardFrom) {
      newErrors.heardFrom = 'Please let us know how you heard about us.';
    } else if (heardFrom === 'Others' && !heardFromOther.trim()) {
      newErrors.heardFromOther = 'Please specify how you heard about us.';
    }

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone.trim());
      formData.append('userType', selectedUserType);

      if (selectedUserType === 'student') {
        formData.append('collegeName', collegeName.trim());
        formData.append('course', course.trim());
        formData.append('year', year);
        if (idFile) {
          formData.append('idCard', idFile);
        }
      } else {
        formData.append('domain', domain.trim());
        if (organization.trim()) {
          formData.append('organization', organization.trim());
        }
      }

      formData.append('heardFrom', heardFrom === 'Others' ? heardFromOther.trim() : heardFrom);

      const res = await api.completeProfile(token, formData);

      if (selectedUserType === 'student' && collegeName) {
        api.addCollege(collegeName).catch(() => {});
      }

      toast.success(res.message || 'Profile completed successfully.');
      updateUser(res.user);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-card" style={{ gridColumn: '1 / -1', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <div className="profile-card-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <h2>Complete Your Profile</h2>
      </div>
      <div className="modal-body feedback-form-container" style={{ padding: '2rem 1.75rem' }}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-stone)', fontSize: '0.95rem' }}>
          Please complete your profile details to unlock your dashboard and proceed with your workshop payment.
        </p>

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          {/* Read Only Email */}
          <div className="register-field">
            <label>Email Address</label>
            <input
              type="email"
              value={user.email}
              disabled
              style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }}
            />
          </div>

          {/* Phone Number */}
          <div className="register-field">
            <label htmlFor="comp-phone">Phone Number *</label>
            <input
              id="comp-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
            />
          </div>

          {/* Account Type Selector / Lock */}
          {user.userType ? (
            <div className="register-field">
              <label>Account Type</label>
              <div style={{
                padding: '0.85rem 1rem',
                background: 'rgba(196,149,106,0.06)',
                border: '1px solid rgba(196,149,106,0.2)',
                borderRadius: '6px',
                color: 'var(--color-espresso)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {user.userType === 'student' ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.34a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.832l8.57 3.698a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
                    Student
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    Working Professional
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="register-field">
              <label>I am a *</label>
              <div className="reg-toggle">
                <button
                  type="button"
                  className={`reg-toggle-btn ${selectedUserType === 'student' ? 'active' : ''}`}
                  onClick={() => setSelectedUserType('student')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.34a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.832l8.57 3.698a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>
                  Student
                </button>
                <button
                  type="button"
                  className={`reg-toggle-btn ${selectedUserType === 'working' ? 'active' : ''}`}
                  onClick={() => setSelectedUserType('working')}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  Working Professional/Others
                </button>
              </div>
            </div>
          )}

          {/* Conditional Fields */}
          {selectedUserType === 'student' && (
            <div className="reg-conditional-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
              <div className="register-field">
                <label htmlFor="comp-idcard">
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
                  onClick={() => !isScanningId && fileInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60px', cursor: isScanningId ? 'not-allowed' : 'pointer', opacity: isScanningId ? 0.7 : 1 }}
                >
                  <input
                    ref={fileInputRef}
                    id="comp-idcard"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0] || null;
                      setIdFile(f);
                      setIdVerdict(null);
                      setIdRejectionReason('');

                      if (f && !isInstitutionalEmail) {
                        setIsScanningId(true);
                        try {
                          const parsed = await api.parseIdCard(f, user.email || undefined);
                          setIdVerdict(parsed.verdict);
                          if (parsed.verdict === 'APPROVED') {
                            setIdRejectionReason('');
                          } else if (parsed.verdict === 'REJECTED') {
                            setIdRejectionReason(parsed.rejection_reason || 'The ID card is not found to be valid.');
                          } else {
                            setIdRejectionReason('');
                          }
                        } catch (err) {
                          console.error('ID Parse Error:', err);
                          setIdVerdict('REVIEW');
                          setIdRejectionReason('');
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
                      PDF only (max. 5MB)
                    </span>
                  )}
                </div>

                {/* Inline validation feedback for non-institutional */}
                {!isInstitutionalEmail && idFile && !isScanningId && (
                  <>
                    {idVerdict === 'APPROVED' && (
                      <div className="id-verdict-line" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', background: 'rgba(34,197,94,0.07)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.2)', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>The ID is found to be valid.</span>
                      </div>
                    )}
                    {idVerdict === 'REJECTED' && (
                      <div className="id-rejected-block" style={{ marginTop: '0.5rem' }}>
                        <div className="id-verdict-line" style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          <span>ID Verification Failed.</span>
                        </div>
                        <div className="id-rejected-hint" style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span>{idRejectionReason || 'The ID card could not be verified.'}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>

              <div className="register-grid-2">
                <div className="register-field">
                  <label htmlFor="comp-college">College Name *</label>
                  <input
                    id="comp-college"
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. PSG College of Technology"
                    required
                  />
                </div>
                <div className="register-field">
                  <label htmlFor="comp-course">Course *</label>
                  <input
                    id="comp-course"
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Tech CSE"
                    required
                  />
                </div>
              </div>

              <div className="register-field">
                <label htmlFor="comp-year">Year of Study *</label>
                <select
                  id="comp-year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
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
              </div>
            </div>
          )}

          {selectedUserType === 'working' && (
            <div className="reg-conditional-fields" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
              <div className="register-grid-2">
                <div className="register-field">
                  <label htmlFor="comp-domain">Domain *</label>
                  <select
                    id="comp-domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="register-select"
                    required
                  >
                    <option value="">Select your industry</option>
                    {DOMAIN_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="register-field">
                  <label htmlFor="comp-org">Organization / Company</label>
                  <input
                    id="comp-org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. TCS, Infosys, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* How did you hear about us? */}
          <div className="register-field" style={{ marginTop: '1.25rem' }}>
            <label htmlFor="comp-heardFrom">How did you hear about us? *</label>
            <select
              id="comp-heardFrom"
              value={heardFrom}
              onChange={(e) => setHeardFrom(e.target.value)}
              className="register-select"
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
              <label htmlFor="comp-heardFromOther">Please specify *</label>
              <input
                id="comp-heardFromOther"
                type="text"
                value={heardFromOther}
                onChange={(e) => setHeardFromOther(e.target.value)}
                placeholder="e.g. Friend, Professor, etc."
                required
              />
            </div>
          )}

          {/* Submit and Logout Buttons */}
          <div style={{ marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn-primary register-submit"
              disabled={isSaving || isScanningId}
              style={{ width: '100%' }}
            >
              {isSaving ? (
                <span className="btn-loading">
                  <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                </span>
              ) : (
                'Save & Complete Profile'
              )}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={logout}
              style={{
                width: '100%',
                marginTop: '0.85rem',
                background: 'transparent',
                border: '1.5px solid var(--color-sand)',
                color: 'var(--color-umber)',
                padding: '0.65rem',
                borderRadius: '6px',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(107, 79, 58, 0.05)';
                e.currentTarget.style.borderColor = 'var(--color-sienna)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--color-sand)';
              }}
            >
              Log Out / Switch Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Profile() {
  const { user, token, logout, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // ── Feedback State ──
  const [feedbackData, setFeedbackData] = useState([
    { session: 'Session 1: Getting Started with Generative AI', text: '' },
    { session: 'Session 2: Building Personalised AI Agents', text: '' },
    { session: 'Session 3: Building Products Using AI', text: '' },
    { session: 'Session 4: Visual Storytelling & Content Creation', text: '' }
  ]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/register');
      return;
    }
    // Refresh user data and settings from server
    Promise.all([
      api.getMe(token),
      api.getPublicSettings()
    ])
      .then(([userData, settings]) => {
        updateUser(userData.user);
        setFeedbackEnabled(settings.feedbackEnabled);
      })
      .catch(() => {
        // Token invalid — log out
        logout();
        navigate('/register');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (isFeedbackModalOpen || payError) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFeedbackModalOpen, payError]);



  if (loading) {
    return (
      <main>
        <section className="profile-section">
          <div className="profile-loading">
            <div className="profile-spinner" />
            <p>Loading your profile…</p>
          </div>
        </section>
      </main>
    );
  }

  if (!user) return null;

  if (user.isProfileComplete === false) {
    return (
      <main>
        <section className="profile-section">
          {/* ── Hero strip ── */}
          <div className="profile-hero">
            <div className="container">
              <div className="profile-hero-inner">
                <div className="profile-avatar">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="profile-hero-text">
                  <h1 className="profile-name">Welcome, {user.fullName}!</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', display: 'flex', justifyContent: 'center' }}>
            <ProfileCompletionForm
              user={user}
              token={token!}
              updateUser={updateUser}
              logout={logout}
            />
          </div>
        </section>
      </main>
    );
  }

  const confirmedEvents = user.registeredEvents?.filter((e) => e.paymentStatus === 'confirmed') ?? [];
  const pendingEvents = user.registeredEvents?.filter((e) => e.paymentStatus !== 'confirmed') ?? [];

  // Deduplicate events based on eventName (keep the one with 'confirmed' status if there are multiple)
  const uniqueEventsMap = new Map<string, RegisteredEvent>();
  (user.registeredEvents || []).forEach(evt => {
    const existing = uniqueEventsMap.get(evt.eventName);
    if (!existing || (existing.paymentStatus !== 'confirmed' && evt.paymentStatus === 'confirmed')) {
      uniqueEventsMap.set(evt.eventName, evt);
    }
  });
  const uniqueEvents = Array.from(uniqueEventsMap.values());

  async function handlePayNow() {
    setPayError('');
    try {
      const order = await api.createOrder(token!);

      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) { resolve(); return; }
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
            await api.verifyPayment(token!, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const { user: freshUser } = await api.getMe(token!);
            updateUser(freshUser);
          } catch (err: any) {
            setPayError(err.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setPayError('Payment was cancelled.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPayError(err.message || 'Failed to initiate payment.');
    }
  }

  async function handleFeedbackSubmit() {
    if (feedbackData.some(f => !f.text.trim())) {
      toast.error('Please provide text feedback for all 4 sessions.');
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      await api.submitFeedback(token!, feedbackData);
      const { user: freshUser } = await api.getMe(token!);
      updateUser(freshUser);
      setIsFeedbackModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  return (
    <main>
      <section className="profile-section">
        {/* ── Hero strip ── */}
        <div className="profile-hero">
          <div className="container">
            <div className="profile-hero-inner">
              <div className="profile-avatar">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="profile-hero-text">
                <h1 className="profile-name">{user.fullName}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="container profile-container">
          {/* ── Details Card ── */}
          <div className="profile-card">
            <div className="profile-card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <h2>Personal Details</h2>
            </div>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="profile-detail-label">Full Name</span>
                <span className="profile-detail-value">{user.fullName}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value">{user.email}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Phone</span>
                <span className="profile-detail-value">{user.phone}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Account Type</span>
                <span className="profile-detail-value">{user.userType === 'student' ? 'Student' : 'Working Professional'}</span>
              </div>

              {user.userType === 'student' && (
                <>
                  {user.collegeName && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">College</span>
                      <span className="profile-detail-value">{user.collegeName}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    {user.course && (
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Course</span>
                        <span className="profile-detail-value">{user.course}</span>
                      </div>
                    )}
                    {user.year && (
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Year</span>
                        <span className="profile-detail-value">{user.year}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {user.userType === 'working' && (
                <>
                  {user.domain && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Domain</span>
                      <span className="profile-detail-value">{user.domain}</span>
                    </div>
                  )}
                  {user.organization && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Organization</span>
                      <span className="profile-detail-value">{user.organization}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="profile-right-column">
            {/* ── My Tickets Card ── */}
            <div className="profile-card">
            <div className="profile-card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
              </svg>
              <h2>My Tickets</h2>
            </div>

            {uniqueEvents.length === 0 ? (
              <div className="profile-empty-tickets">
                <p>No events registered yet.</p>
                <a href="/register" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Register Now →</a>
              </div>
            ) : (
              <div className="ticket-list">
                {uniqueEvents.map((evt: RegisteredEvent, i: number) => (
                  <div key={i} className={`ticket-card ${evt.paymentStatus}`}>
                    <div className="ticket-card-left">
                      <div className="ticket-event-name">{evt.eventName}</div>
                      <div className="ticket-meta">
                        {evt.registeredAt && (
                          <span>Registered {new Date(evt.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        )}
                      </div>
                      {evt.paymentStatus === 'confirmed' && (
                        <p style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--color-sienna)', fontFamily: 'var(--font-sans)' }}>
                          Check your mail for more updates
                        </p>
                      )}
                    </div>
                    <div className="ticket-card-right">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span
                          className={`ticket-badge badge-${(user as any).isWaitlisted ? 'waitlisted' : evt.paymentStatus}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: (user as any).isWaitlisted ? 'rgba(107, 114, 128, 0.1)' : undefined, color: (user as any).isWaitlisted ? '#4b5563' : undefined, border: (user as any).isWaitlisted ? '1px solid rgba(107, 114, 128, 0.2)' : undefined }}
                        >
                          {evt.paymentStatus === 'confirmed' ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Payment Completed</>
                          ) : evt.paymentStatus === 'failed' ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Payment Failed</>
                          ) : (user as any).isWaitlisted ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Waitlisted</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Payment Pending</>
                          )}
                        </span>
                        {evt.paymentStatus === 'confirmed' && (
                          <a
                            href={evt.zoomJoinUrl || import.meta.env.VITE_ZOOM_LINK || "https://zoom.us/j/00000000000"}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(37,99,235,0.08)',
                              color: '#1d4ed8',
                              border: '1px solid rgba(37,99,235,0.2)',
                              borderRadius: '100px',
                              padding: '0.3rem 0.9rem',
                              fontSize: '0.82rem',
                              fontFamily: 'var(--font-sans)',
                              fontWeight: 600,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg>
                            Join Zoom Meeting
                          </a>
                        )}
                      </div>
                      {evt.paymentStatus === 'pending' && !(user as any).isWaitlisted && (
                        <button className="btn-primary" onClick={handlePayNow} style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-block' }}>Complete Payment →</button>
                      )}
                      {(user as any).isWaitlisted && evt.paymentStatus !== 'confirmed' && (
                        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-stone)', background: '#f9fafb', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          You have been successfully registered! Updates for the upcoming session will be sent soon by email.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Certificate & Feedback Card ── */}
          {uniqueEvents.some(e => e.paymentStatus === 'confirmed') && (
            <div className="profile-card">
              <div className="profile-card-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h2>Certificate</h2>
              </div>
              
              {(user as any).isFeedbackSubmitted ? (
                <div style={{ padding: '1.25rem 1.5rem 1.75rem 1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-umber)', fontSize: '1rem' }}>Feedback Completed</h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--color-stone)' }}>
                    Thank you for your valuable feedback!
                  </p>
                  <Suspense fallback={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', color: 'var(--color-stone)', fontSize: '0.88rem' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin-slow 2s linear infinite', color: '#C4956A' }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Preparing Certificate Button...
                    </div>
                  }>
                    <DownloadCertificateButton fullName={user.fullName} userId={user.id || (user as any)._id} />
                  </Suspense>
                </div>
              ) : (
                !feedbackEnabled ? (
                  <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-stone)', fontSize: '0.95rem' }}>
                      The feedback form will be enabled by the admin shortly. <br/> 
                      Please check back later to submit your feedback and unlock your certificate.
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-umber)' }}>Feedback Required</h3>
                    <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-stone)' }}>
                      Please share your feedback for the 4 sessions to unlock your certificate.
                    </p>
                    <button 
                      className="btn-primary" 
                      onClick={() => setIsFeedbackModalOpen(true)}
                    >
                      Share Feedback
                    </button>
                  </div>
                )
              )}
            </div>
          )}
          </div>
        </div>
      </section>

      {isFeedbackModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFeedbackModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Session Feedback</h2>
              <button className="modal-close" onClick={() => setIsFeedbackModalOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body feedback-form-container">
              <p style={{ marginBottom: '1rem', color: 'var(--color-stone)', fontSize: '0.95rem' }}>
                Share your feedback for all 4 sessions to unlock your certificate.
              </p>
              {feedbackData.map((fb, idx) => (
                <div key={idx} style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                    <label style={{ display: 'block', fontWeight: 600, color: 'var(--color-umber)', fontSize: '0.93rem' }}>
                      {fb.session} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: fb.text.length > 280 ? '#ef4444' : 'var(--color-stone)' }}>
                      {fb.text.length}/300
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={300}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      border: '1.5px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'border-color 0.2s',
                      lineHeight: '1.5',
                    }}
                    value={fb.text}
                    onChange={e => {
                      const newData = [...feedbackData];
                      newData[idx].text = e.target.value;
                      setFeedbackData(newData);
                    }}
                    required
                    placeholder="Share your thoughts..."
                    onFocus={e => (e.target.style.borderColor = 'var(--color-sienna)')}
                    onBlur={e => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>
              ))}
              <button 
                className="btn-primary" 
                onClick={handleFeedbackSubmit} 
                disabled={isSubmittingFeedback || feedbackData.some(f => !f.text.trim())}
                style={{ width: '100%', padding: '0.7rem', marginTop: '0.5rem', opacity: feedbackData.some(f => !f.text.trim()) ? 0.6 : 1 }}
              >
                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback & Unlock Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {payError && (
        <div className="modal-overlay" onClick={() => setPayError('')}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '12px' }}>
            <div className="modal-header" style={{ borderBottom: 'none' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-espresso)' }}>Payment Update</h2>
              <button className="modal-close" onClick={() => setPayError('')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem 2rem 2rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{
                  background: '#fee2e2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '50%',
                  width: '56px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-espresso)', marginBottom: '1.5rem' }}>
                {payError.toLowerCase().includes('cancel') ? 'Payment Cancelled' : 'Payment Failed'}
              </h3>
              <button
                className="btn-primary"
                onClick={() => setPayError('')}
                style={{ width: '100%', padding: '0.7rem' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
