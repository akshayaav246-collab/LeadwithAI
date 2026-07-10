import { useEffect, useState, lazy, Suspense, useRef, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'wouter';
import { useAuth, type RegisteredEvent } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { toast } from 'sonner';
import { publicAsset } from '@/lib/assets';

const isValidPhone = (p: string): boolean => {
  if (!p) return false;
  const hasInvalidPhoneChars = /[^\d+\s()-]/.test(p);
  if (hasInvalidPhoneChars) return false;
  const cleaned = p.replace(/[^\d+]/g, '');
  const isIndia = /^(?:\+?91|0)?[6-9]\d{9}$/.test(cleaned);
  const isNepal = /^(?:\+?977)?9[678]\d{8}$/.test(cleaned);
  return isIndia || isNepal;
};

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
  availableCohorts: string[];
  salespersons: string[];
  activeCohort: string;
}

function ProfileCompletionForm({ user, token, updateUser, logout, availableCohorts, salespersons, activeCohort }: ProfileCompletionFormProps) {
  const [phone, setPhone] = useState(user.phone || '');
  const [selectedUserType, setSelectedUserType] = useState<'student' | 'working'>(
    user.userType || 'student'
  );
  const [country, setCountry] = useState(user.country || 'India');
  const [collegeName, setCollegeName] = useState(user.collegeName || '');
  const [course, setCourse] = useState(user.course || '');
  const [year, setYear] = useState(user.year || '');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isScanningId, setIsScanningId] = useState(false);
  const [idVerdict, setIdVerdict] = useState<'APPROVED' | 'REJECTED' | 'REVIEW' | 'TRAFFIC_ERROR' | null>(null);
  const [idRejectionReason, setIdRejectionReason] = useState('');

  const [domain, setDomain] = useState(user.domain || '');
  const [organization, setOrganization] = useState(user.organization || '');

  // Pre-fill heardFrom logic
  const getHeardFromInitial = () => {
    if (!user.heardFrom) return '';
    if (user.heardFrom.startsWith('GKT Employee') || user.heardFrom === 'Referral' || user.salesperson || (user.referralCode && user.referralCode !== '-')) return 'GKT Employee';
    const mainOptions = ['Social Media', 'Newspaper', 'GKT Employee'];
    if (mainOptions.includes(user.heardFrom)) return user.heardFrom;
    return 'Others';
  };
  const getHeardFromOtherInitial = () => {
    if (!user.heardFrom) return '';
    if (user.heardFrom.startsWith('GKT Employee') || user.heardFrom === 'Referral' || user.salesperson || (user.referralCode && user.referralCode !== '-')) return '';
    const mainOptions = ['Social Media', 'Newspaper', 'GKT Employee'];
    if (mainOptions.includes(user.heardFrom)) return '';
    return user.heardFrom;
  };

  const [heardFrom, setHeardFrom] = useState(getHeardFromInitial());
  const [heardFromOther, setHeardFromOther] = useState(getHeardFromOtherInitial());
  const [salesperson, setSalesperson] = useState(user.salesperson || (user.referralCode && user.referralCode !== '-' ? user.referralCode : ''));
  const [selectedCohort, setSelectedCohort] = useState(user.selectedCohort || activeCohort || '');

  const [isSaving, setIsSaving] = useState(false);
  const hasReferral = !!(localStorage.getItem('referralCode') || (user && user.referralCode && user.referralCode !== '-'));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isInstitutionalEmail =
    selectedUserType === 'student' && /\.(ac|edu)\.in$/i.test(user.email.trim());

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!isValidPhone(phone)) {
      newErrors.phone = 'Please enter a valid India (+91) or Nepal (+977) phone number.';
    }

    if (!selectedUserType) {
      newErrors.userType = 'Please select your account type.';
    }

    if (selectedUserType === 'student') {
      if (!idFile && !user.idCardPath) {
        newErrors.idCard = 'Please upload your College ID Card.';
      } else if (country !== 'Nepal' && !user.groupLeaderId) {
        if (!isInstitutionalEmail && idVerdict === 'REJECTED') {
          newErrors.idCard = idRejectionReason || 'The ID card could not be verified. Please upload a valid physical ID.';
        } else if (!isInstitutionalEmail && isScanningId) {
          newErrors.idCard = 'Please wait — your ID card is being validated.';
        }
      }
      if (!collegeName.trim()) newErrors.collegeName = 'Please enter your college name.';
      if (!course.trim()) newErrors.course = 'Please enter your course.';
      if (!year) newErrors.year = 'Please select your year.';
    } else if (selectedUserType === 'working') {
      if (!domain.trim()) newErrors.domain = 'Please select your domain.';
      if (!organization.trim()) newErrors.organization = 'Please enter your organization/company.';
    }

    if (!user.groupLeaderId && !hasReferral) {
      if (!heardFrom) {
        newErrors.heardFrom = 'Please let us know how you heard about us.';
      } else if (heardFrom === 'Others' && !heardFromOther.trim()) {
        newErrors.heardFromOther = 'Please specify how you heard about us.';
      } else if (heardFrom === 'GKT Employee' && !salesperson) {
        newErrors.salesperson = 'Please select your referral.';
      }
    }

    if (activeCohort && !selectedCohort) {
      newErrors.selectedCohort = 'Please select your preferred date.';
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
      formData.append('selectedCohort', selectedCohort);
      formData.append('country', country);

      if (selectedUserType === 'student') {
        formData.append('collegeName', collegeName.trim());
        formData.append('course', course.trim());
        formData.append('year', year);
        if (idFile) {
          formData.append('idCard', idFile);
        }
      } else {
        formData.append('domain', domain.trim());
        formData.append('organization', organization.trim());
      }

      if (!user.groupLeaderId && !hasReferral) {
        formData.append('heardFrom', heardFrom === 'Others' ? heardFromOther.trim() : heardFrom);
        if (heardFrom === 'GKT Employee' && salesperson) {
          formData.append('salesperson', salesperson);
        }
      }

      const res = await api.completeProfile(token, formData);



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
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s()-]/g, ''))}
              placeholder="+91 98765 43210"
              maxLength={25}
              required
            />
          </div>

          {/* Country Selection */}
          <div className="register-field">
            <label htmlFor="comp-country">Country *</label>
            <select
              id="comp-country"
              value={country}
              onChange={(e) => {
                const selectedVal = e.target.value;
                setCountry(selectedVal);
                if (selectedVal === 'Nepal') {
                  setIdFile(null);
                  setIdVerdict(null);
                  setIdRejectionReason('');
                }
              }}
              className="register-select"
              required
            >
              <option value="India">India</option>
              <option value="Nepal">Nepal</option>
            </select>
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

                        const isGroupMember = !!user.groupLeaderId;
                        if (f && !isInstitutionalEmail && !user.isAdminCreated && country !== 'Nepal' && !isGroupMember) {
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
                        {user.idCardPath ? 'ID Card uploaded (Click to change)' : 'PDF only (max. 5MB)'}
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
                  <label htmlFor="comp-org">Organization / Company *</label>
                  <input
                    id="comp-org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. TCS, Infosys, etc."
                    required
                  />
                </div>
              </div>
            </div>
          )}



          {/* How did you hear about us? */}
          {!user.groupLeaderId && !hasReferral && (
            <>
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
                  <option value="GKT Employee">GKT Employee</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {heardFrom === 'GKT Employee' && (
                <div className="register-field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="comp-salesperson">Referral *</label>
                  <select
                    id="comp-salesperson"
                    value={salesperson}
                    onChange={(e) => setSalesperson(e.target.value)}
                    className="register-select"
                    required
                  >
                    <option value="">Select referral</option>
                    {salespersons.map(sp => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                    {salesperson && !salespersons.includes(salesperson) && (
                      <option value={salesperson}>{salesperson}</option>
                    )}
                  </select>
                </div>
              )}

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
            </>
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
    { session: 'Session 1: Getting Started with Generative AI', rating: '', text: '' },
    { session: 'Session 2: Building Personalised AI Agents', rating: '', text: '' },
    { session: 'Session 3: Building Products Using AI', rating: '', text: '' },
    { session: 'Session 4: Visual Storytelling & Content Creation', rating: '', text: '' }
  ]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [availableCohorts, setAvailableCohorts] = useState<string[]>([]);
  const [activeCohort, setActiveCohort] = useState('');
  const [salespersons, setSalespersons] = useState<string[]>([]);
  const [feedbackEnabledCohorts, setFeedbackEnabledCohorts] = useState<string[]>([]);
  const [allowProfileGroupAdditions, setAllowProfileGroupAdditions] = useState(false);

  // Editing working professional details
  const [isEditingWorkingDetails, setIsEditingWorkingDetails] = useState(false);
  const [editDomain, setEditDomain] = useState(user?.domain || '');
  const [editOrg, setEditOrg] = useState(user?.organization || '');
  const [isSavingWorkingDetails, setIsSavingWorkingDetails] = useState(false);

  useEffect(() => {
    if (user) {
      setEditDomain(user.domain || '');
      setEditOrg(user.organization || '');
    }
  }, [user]);

  const handleSaveWorkingDetails = async () => {
    if (!editDomain.trim()) {
      toast.error('Domain is required.');
      return;
    }
    if (!editOrg.trim()) {
      toast.error('Organization is required.');
      return;
    }
    setIsSavingWorkingDetails(true);
    try {
      const res = await api.updateWorkingDetails(token!, editDomain.trim(), editOrg.trim());
      toast.success(res.message || 'Professional details updated successfully.');
      updateUser(res.user);
      setIsEditingWorkingDetails(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update professional details.');
    } finally {
      setIsSavingWorkingDetails(false);
    }
  };

  // Group Member form states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberFullName, setMemberFullName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberCollegeName, setMemberCollegeName] = useState('');
  const [memberCourse, setMemberCourse] = useState('');
  const [memberYear, setMemberYear] = useState('');
  const [memberDomain, setMemberDomain] = useState('');
  const [memberOrg, setMemberOrg] = useState('');
  const [memberIdFile, setMemberIdFile] = useState<File | null>(null);
  const memberFileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [isUpdatingCohort, setIsUpdatingCohort] = useState(false);



  const closeAddMemberModal = () => {
    setShowAddMemberModal(false);
    setMemberFullName('');
    setMemberEmail('');
    setMemberPhone('');
    setMemberCollegeName('');
    setMemberCourse('');
    setMemberYear('');
    setMemberDomain('');
    setMemberOrg('');
    setMemberIdFile(null);
  };



  useEffect(() => {
    if (!token) {
      navigate('/register');
      return;
    }
    Promise.all([
      api.getMe(token),
      api.getPublicSettings()
    ])
      .then(([userData, settings]) => {
        updateUser(userData.user);
        if (settings) {
          if (settings.feedbackEnabledCohorts) {
            setFeedbackEnabledCohorts(settings.feedbackEnabledCohorts);
          }
          if (settings.availableCohorts) {
            setAvailableCohorts(settings.availableCohorts);
          }
          setActiveCohort((settings as any).activeCohort || '');
          if ((settings as any).allowProfileGroupAdditions !== undefined) {
            setAllowProfileGroupAdditions(!!(settings as any).allowProfileGroupAdditions);
          }
          if (settings.referralCodes) {
            const activeReferrals = settings.referralCodes
              .filter((rc: any) => rc.isActive)
              .map((rc: any) => rc.label);
            setSalespersons(activeReferrals);
          }
        }
      })
      .catch(() => {
        // Token invalid — log out
        logout();
        navigate('/register');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (user && user.selectedCohort && feedbackEnabledCohorts.length > 0) {
      setFeedbackEnabled(feedbackEnabledCohorts.includes(user.selectedCohort));
    } else {
      setFeedbackEnabled(false);
    }
  }, [user?.selectedCohort, feedbackEnabledCohorts]);

  const isUpcomingCohort = user && user.selectedCohort !== 'June 13 & 14, 2026';

  useEffect(() => {
    if (user) {
      if (user.selectedCohort && user.selectedCohort !== 'June 13 & 14, 2026') {
        setFeedbackData([
          { session: '1. Overall, how would you rate this workshop?', rating: '', text: '' },
          { session: '2. What was the most valuable takeaway of this workshop for you?', rating: '', text: '' },
          { session: '3. Was there any topic, activity, or information that you expected but was not covered?', rating: '', text: '' },
          { session: '4. Please share a testimonial or a few words about your experience', rating: '', text: '' },
          { session: '5. What topics would you like us to cover in future workshops?', rating: '', text: '' }
        ]);
      } else {
        setFeedbackData([
          { session: 'Session 1: Getting Started with Generative AI', rating: '', text: '' },
          { session: 'Session 2: Building Personalised AI Agents', rating: '', text: '' },
          { session: 'Session 3: Building Products Using AI', rating: '', text: '' },
          { session: 'Session 4: Visual Storytelling & Content Creation', rating: '', text: '' }
        ]);
      }
    }
  }, [user?.selectedCohort]);

  useEffect(() => {
    if (payError) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [payError]);



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
              availableCohorts={availableCohorts}
              salespersons={salespersons}
              activeCohort={activeCohort}
            />
          </div>
        </section>
      </main>
    );
  }




  const costPerPerson = user.userType === 'student' ? 499 : 999;
  const leaderConfirmed = user.registeredEvents?.some((e: any) => e.eventName === 'Lead with AI: Adopt, Implement and Transform' && e.paymentStatus === 'confirmed');

  const unpaidAttendees = (user.groupMembers || []).filter((m: any) => {
    return !m.registeredEvents?.some((e: any) => e.eventName === 'Lead with AI: Adopt, Implement and Transform' && e.paymentStatus === 'confirmed');
  });
  const unpaidAttendeesCount = unpaidAttendees.length;
  const needToPaySelf = !leaderConfirmed;
  let totalAmount = 0;
  if (needToPaySelf) {
    totalAmount += costPerPerson;
  }
  unpaidAttendees.forEach((m: any) => {
    totalAmount += m.userType === 'student' ? 499 : 999;
  });

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
        theme: { color: '#3B8BD4' },
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

  const validateFeedback = () => {
    if (!isUpcomingCohort) {
      return !feedbackData.some(f => !f.rating);
    } else {
      if (!feedbackData[0]?.rating) return false;
      if (!feedbackData[1]?.text.trim()) return false;
      if (!feedbackData[3]?.text.trim()) return false;
      return true;
    }
  };

  async function handleFeedbackSubmit() {
    if (!isUpcomingCohort) {
      if (feedbackData.some(f => !f.rating)) {
        toast.error('Please select a rating for all 4 sessions.');
        return;
      }
    } else {
      if (!feedbackData[0]?.rating) {
        toast.error('Please select a rating for Question 1.');
        return;
      }
      if (!feedbackData[1]?.text.trim()) {
        toast.error('Please answer Question 2 (Most valuable takeaway).');
        return;
      }
      if (!feedbackData[3]?.text.trim()) {
        toast.error('Please answer Question 4 (Testimonial).');
        return;
      }
    }
    setIsSubmittingFeedback(true);
    try {
      const cleanedFeedback = feedbackData.map((f, idx) => {
        if (isUpcomingCohort && idx > 0) {
          return { session: f.session, rating: '', text: f.text.trim() };
        }
        return { session: f.session, rating: f.rating, text: f.text.trim() };
      });

      await api.submitFeedback(token!, cleanedFeedback);
      const { user: freshUser } = await api.getMe(token!);
      updateUser(freshUser);
      setIsFeedbackModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  const handleAddMember = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!memberFullName.trim() || !memberEmail.trim() || !memberPhone.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    
    if (!isValidPhone(memberPhone)) {
      toast.error('Please enter a valid India (+91) or Nepal (+977) phone number.');
      return;
    }

    const payload = new FormData();
    payload.append('fullName', memberFullName.trim());
    payload.append('email', memberEmail.toLowerCase().trim());
    payload.append('phone', memberPhone.trim());

    if (user.userType === 'student') {
      if (!memberCollegeName.trim() || !memberCourse.trim() || !memberYear) {
        toast.error('Please complete all student details.');
        return;
      }
      if (!memberIdFile) {
        toast.error('Please upload student ID card.');
        return;
      }
      payload.append('collegeName', memberCollegeName.trim());
      payload.append('course', memberCourse.trim());
      payload.append('year', memberYear);
      payload.append('idCard', memberIdFile);
    } else {
      if (!memberOrg.trim()) {
        toast.error('Organization is required.');
        return;
      }
      payload.append('domain', memberDomain || 'General');
      payload.append('organization', memberOrg.trim());
    }

    setIsAddingMember(true);
    try {
      const res = await api.addGroupMember(token!, payload);
      toast.success(res.message || 'Colleague/Friend added successfully.');
      // Refresh user details to get updated groupMembers
      const userData = await api.getMe(token!);
      updateUser(userData.user);
      closeAddMemberModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add colleague/friend.');
    } finally {
      setIsAddingMember(false);
    }
  };

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
              <div className="profile-detail-item">
                <span className="profile-detail-label">Country</span>
                <span className="profile-detail-value">{user.country || 'India'}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Date</span>
                <span className="profile-detail-value">
                  {activeCohort || 'Will update soon'}
                </span>
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
                  {isEditingWorkingDetails && user.groupLeaderId ? (
                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div className="register-field">
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-espresso)' }}>Domain *</label>
                        <select
                          value={editDomain}
                          onChange={(e) => setEditDomain(e.target.value)}
                          className="register-select"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem' }}
                        >
                          <option value="">Select Domain</option>
                          {DOMAIN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div className="register-field">
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-espresso)' }}>Organization *</label>
                        <input
                          type="text"
                          value={editOrg}
                          onChange={(e) => setEditOrg(e.target.value)}
                          placeholder="e.g. TCS"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          onClick={handleSaveWorkingDetails}
                          disabled={isSavingWorkingDetails}
                        >
                          {isSavingWorkingDetails ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}
                          onClick={() => {
                            setEditDomain(user.domain || '');
                            setEditOrg(user.organization || '');
                            setIsEditingWorkingDetails(false);
                          }}
                          disabled={isSavingWorkingDetails}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Domain</span>
                        <span className="profile-detail-value">{user.domain || '-'}</span>
                      </div>
                      <div className="profile-detail-item">
                        <span className="profile-detail-label">Organization</span>
                        <span className="profile-detail-value">{user.organization || '-'}</span>
                      </div>
                      {user.groupLeaderId && (
                        <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => setIsEditingWorkingDetails(true)}
                          >
                            Edit Professional Details
                          </button>
                        </div>
                      )}
                    </>
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
                        <p style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--color-sienna)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                          Workshop details will be shared shortly through mail
                        </p>
                      )}
                    </div>
                    <div className="ticket-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {(() => {
                          const isNepalVerificationPending = user.country === 'Nepal' && evt.paymentMethod === 'nepal_upi' && evt.nepalUpiTxnRef && evt.paymentStatus !== 'confirmed';
                          return (
                            <span
                              className={`ticket-badge badge-${
                                (user as any).isWaitlisted 
                                  ? 'waitlisted' 
                                  : isNepalVerificationPending
                                    ? 'verification-pending'
                                    : evt.paymentStatus
                              }`}
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                background: (user as any).isWaitlisted 
                                  ? 'rgba(107, 114, 128, 0.1)' 
                                  : undefined, 
                                color: (user as any).isWaitlisted 
                                  ? '#4b5563' 
                                  : undefined, 
                                border: (user as any).isWaitlisted 
                                  ? '1px solid rgba(107, 114, 128, 0.2)' 
                                  : undefined 
                              }}
                            >
                              {evt.paymentStatus === 'confirmed' ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Payment Completed</>
                              ) : evt.paymentStatus === 'failed' ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Payment Failed</>
                              ) : (user as any).isWaitlisted ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Waitlisted</>
                              ) : isNepalVerificationPending ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Verification Pending</>
                              ) : (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Payment Pending</>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    {evt.paymentStatus === 'pending' && !(user as any).isWaitlisted && (
                      <div style={{ marginTop: '1rem', background: '#fcfbf9', border: '1px solid #e7dfd5', borderRadius: '8px', padding: '1rem', width: '100%', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--color-espresso)', fontWeight: 600, marginBottom: '0.75rem' }}>
                          <span>Registration Amount{unpaidAttendeesCount > 0 ? ` (including ${unpaidAttendeesCount} attendees)` : ''}:</span>
                          <span>₹{totalAmount}</span>
                        </div>
                        <button 
                          className="btn-primary" 
                          onClick={handlePayNow} 
                          style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', display: 'block' }}
                        >
                          Pay ₹{totalAmount} Now →
                        </button>
                      </div>
                    )}
                      {(user as any).isWaitlisted && evt.paymentStatus !== 'confirmed' && (
                        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-stone)', background: '#f9fafb', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                          You have been successfully registered! Updates for the upcoming session will be sent soon by email.
                        </p>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Group Registration Card ── */}
          {!user.groupLeaderId && user.groupMembers && user.groupMembers.length > 0 && (
            <div className="profile-card">
              <div className="profile-card-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h2>Group Registration</h2>
              </div>
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {user.groupMembers.map((m: any, idx: number) => {
                    const paid = m.registeredEvents?.some((e: any) => e.paymentStatus === 'confirmed');
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fcfbf9', border: '1px solid #e7dfd5', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-espresso)', fontSize: '0.95rem' }}>{m.fullName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-stone)' }}>{m.email} | {m.phone}</div>
                          {m.userType === 'student' ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-sienna)', marginTop: '2px' }}>{m.collegeName} ({m.course})</div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-sienna)', marginTop: '2px' }}>{m.organization}</div>
                          )}
                        </div>
                        <span className={`ticket-badge badge-${paid ? 'confirmed' : 'pending'}`}>
                          {paid ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Certificate & Feedback Card ── */}
          {uniqueEvents.some(e => e.paymentStatus === 'confirmed') && (
            <div className="profile-card">
              <div className="profile-card-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h2>Certificate</h2>
              </div>
              
              {user.isFeedbackSubmitted ? (
                <div style={{ padding: '1.25rem 1.5rem 1.75rem 1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-umber)', fontSize: '1rem' }}>Feedback Completed</h3>
                  <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--color-stone)' }}>
                    Thank you for your valuable feedback! You can now download your certificate of completion below.
                  </p>
                  <div style={{ maxWidth: '320px' }}>
                    <Suspense fallback={<div>Loading certificate generator...</div>}>
                      <DownloadCertificateButton fullName={user.fullName} userId={user.id} selectedCohort={user.selectedCohort} />
                    </Suspense>
                  </div>
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

      {isFeedbackModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsFeedbackModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#0a0d3d', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px 8px 0 0' }}>
              <h2 style={{ color: '#ffffff', margin: 0 }}>Session Feedback</h2>
              <button className="modal-close" onClick={() => setIsFeedbackModalOpen(false)} style={{ color: '#ffffff', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body feedback-form-container">
              <p style={{ marginBottom: '1rem', color: 'var(--color-stone)', fontSize: '0.95rem' }}>
                {isUpcomingCohort 
                  ? 'Please fill in the workshop feedback form to unlock your certificate.'
                  : 'Share your feedback for all 4 sessions to unlock your certificate.'}
              </p>
              {feedbackData.map((fb, idx) => {
                const showStars = !isUpcomingCohort || idx === 0;
                const showText = !isUpcomingCohort || idx > 0;
                const isRequired = !isUpcomingCohort || idx === 0 || idx === 1 || idx === 3;
                
                return (
                  <div key={idx} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, color: 'var(--color-umber)', fontSize: '0.93rem' }}>
                        {fb.session} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      {showText && (
                        <span style={{ fontSize: '0.72rem', color: fb.text.length > 280 ? '#ef4444' : 'var(--color-stone)' }}>
                          {fb.text.length}/300
                        </span>
                      )}
                    </div>

                    {showStars && (
                      <div className="rating-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: showText ? '0.5rem' : '0' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`rating-star ${Number(fb.rating) >= star ? 'active' : ''}`}
                            onClick={() => {
                              const newData = [...feedbackData];
                              newData[idx].rating = String(star);
                              setFeedbackData(newData);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.6rem',
                              color: Number(fb.rating) >= star ? '#eab308' : '#e2e8f0',
                              transition: 'color 0.15s ease',
                              padding: '2px'
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    )}

                    {showText && (
                      <textarea
                        rows={!isUpcomingCohort ? 2 : 3}
                        maxLength={300}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1.5px solid #d1d5db',
                          background: '#ffffff',
                          color: '#111827',
                          fontFamily: 'inherit',
                          fontSize: '0.88rem',
                          outline: 'none',
                          resize: 'none',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                          transition: 'border-color 0.2s',
                          lineHeight: '1.4',
                        }}
                        value={fb.text}
                        onChange={e => {
                          const newData = [...feedbackData];
                          newData[idx].text = e.target.value;
                          setFeedbackData(newData);
                        }}
                        placeholder={isUpcomingCohort && idx > 0 ? "Type your answer here..." : "Additional remarks (optional)..."}
                        onFocus={e => (e.target.style.borderColor = 'var(--color-sienna)')}
                        onBlur={e => (e.target.style.borderColor = '#d1d5db')}
                      />
                    )}
                  </div>
                );
              })}
              <button 
                className="btn-primary" 
                onClick={handleFeedbackSubmit} 
                disabled={isSubmittingFeedback || !validateFeedback()}
                style={{ width: '100%', padding: '0.7rem', marginTop: '0.5rem', opacity: !validateFeedback() ? 0.6 : 1 }}
              >
                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback & Unlock Certificate'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {payError && createPortal(
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
        </div>,
        document.body
      )}


      {/* ── Add Group Member Modal ── */}
      {showAddMemberModal && createPortal(
        <div className="modal-overlay" onClick={closeAddMemberModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Add Colleague/Friend</h2>
              <button className="modal-close" onClick={closeAddMemberModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body feedback-form-container" style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1.25rem', color: 'var(--color-stone)', fontSize: '0.88rem' }}>
                Add a participant to your group. They must be a <strong>{user.userType === 'student' ? 'Student' : 'Working Professional'}</strong>.
              </p>
              <form onSubmit={handleAddMember} className="register-form" noValidate>
                <div className="register-field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={memberFullName}
                    onChange={e => setMemberFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="register-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={e => setMemberEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="register-field">
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    value={memberPhone}
                    onChange={e => setMemberPhone(e.target.value.replace(/[^\d+\s()-]/g, ''))}
                    placeholder="+91 98765 43210"
                    maxLength={25}
                    required
                  />
                </div>

                {user.userType === 'student' ? (
                  <>
                    <div className="register-field">
                      <label>College Name *</label>
                      <input
                        type="text"
                        value={memberCollegeName}
                        onChange={e => setMemberCollegeName(e.target.value)}
                        placeholder="e.g. PSG College of Technology"
                        required
                      />
                    </div>
                    <div className="register-grid-2">
                      <div className="register-field">
                        <label>Course *</label>
                        <input
                          type="text"
                          value={memberCourse}
                          onChange={e => setMemberCourse(e.target.value)}
                          placeholder="e.g. B.Tech CSE"
                          required
                        />
                      </div>
                      <div className="register-field">
                        <label>Year of Study *</label>
                        <select
                          value={memberYear}
                          onChange={e => setMemberYear(e.target.value)}
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
                    <div className="register-field">
                      <label htmlFor="member-idcard">College ID Card * (PDF only)</label>
                      <div
                        className={`register-upload ${memberIdFile ? 'has-file' : ''}`}
                        onClick={() => memberFileInputRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60px', cursor: 'pointer', border: '2px dashed var(--color-stone-light)', borderRadius: '8px', padding: '0.75rem' }}
                      >
                        <input
                          ref={memberFileInputRef}
                          id="member-idcard"
                          type="file"
                          accept=".pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setMemberIdFile(f);
                          }}
                        />
                        {memberIdFile ? (
                          <span className="upload-filename" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#166534', fontWeight: 500 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {memberIdFile.name}
                          </span>
                        ) : (
                          <span className="upload-placeholder" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-stone)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            PDF only (max. 5MB)
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="register-field">
                      <label>Domain *</label>
                      <select
                        value={memberDomain}
                        onChange={e => setMemberDomain(e.target.value)}
                        className="register-select"
                        required
                      >
                        <option value="">Select domain</option>
                        {DOMAIN_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="register-field">
                      <label>Organization / Company *</label>
                      <input
                        type="text"
                        value={memberOrg}
                        onChange={e => setMemberOrg(e.target.value)}
                        placeholder="e.g. TCS, Infosys, etc."
                        required
                      />
                    </div>
                  </>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '0.7rem', marginTop: '1rem' }}
                  disabled={isAddingMember}
                >
                  {isAddingMember ? 'Saving...' : 'Save Colleague/Friend'}
                </button>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
