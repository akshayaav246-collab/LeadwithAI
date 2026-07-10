import React, { useEffect, useState } from 'react';
import {
  getAdminSettings,
  updateFeedbackSetting,
  updateMaintenanceMode,
  updateRegistrationCap,
  addReferralCode,
  toggleReferralCode,
  deleteReferralCode,
  updateReferralLabel,
  getAdmins,
  deleteAdmin,
  addCohort,
  deleteCohort,
  getCohortCount,
  updateActiveCohort,
  toggleCohortFeedbackApi,
  updateGroupAdditionsSetting
} from '../../lib/api';
import { toast } from 'sonner';

function isCohortCompleted(cohortStr: string) {
  if (!cohortStr) return false;
  const match = cohortStr.match(/([A-Za-z]+)\s+(\d+)\s*(?:&\s*(\d+))?,\s*(\d{4})/);
  if (match) {
    const monthStr = match[1];
    const day2 = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
    const year = parseInt(match[4], 10);
    
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = months[monthStr.toLowerCase()] !== undefined ? months[monthStr.toLowerCase()] : 5;
    
    // Create Date for the end of the cohort day (6:00 PM IST -> 12:30 UTC)
    const cohortEndDate = new Date(Date.UTC(year, month, day2, 12, 30, 0));
    return new Date() > cohortEndDate;
  }
  return false;
}

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [feedbackEnabledCohorts, setFeedbackEnabledCohorts] = useState<string[]>([]);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [registrationCap, setRegistrationCap] = useState(1000);
  const [newCap, setNewCap] = useState<number | ''>('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [activeCohort, setActiveCohort] = useState<string>('');
  const [cohortCounts, setCohortCounts] = useState<Record<string, number>>({});
  // Date-picker state for adding a new cohort (two-day format: "Month Day1 & Day2, Year")
  const [newCohortMonth, setNewCohortMonth] = useState('');
  const [newCohortDay1, setNewCohortDay1] = useState('');
  const [newCohortDay2, setNewCohortDay2] = useState('');
  const [newCohortYear, setNewCohortYear] = useState(String(new Date().getFullYear()));
  const [allowProfileGroupAdditions, setAllowProfileGroupAdditions] = useState(false);

  // Migration modal state
  type MigrationModal = {
    cohort: string;
    count: number;
    isActive: boolean;
    migrateTo: string;
  };
  const [migrationModal, setMigrationModal] = useState<MigrationModal | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  // New referral input state
  const [refCode, setRefCode] = useState('');
  const [refLabel, setRefLabel] = useState('');

  // Inline edit state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const token = localStorage.getItem('adminToken') || '';

  const fetchSettingsAndAdmins = async () => {
    setLoading(true);
    try {
      const settings = await getAdminSettings(token);
      setFeedbackEnabled(settings.feedbackEnabled);
      setFeedbackEnabledCohorts(settings.feedbackEnabledCohorts || []);
      setIsMaintenance(settings.isMaintenanceMode);
      setRegistrationCap(settings.registrationCap);
      setNewCap(settings.registrationCap);
      setReferrals(settings.referralCodes || []);
      setCohorts((settings as any).cohorts || []);
      setActiveCohort((settings as any).activeCohort || '');
      setAllowProfileGroupAdditions(!!(settings as any).allowProfileGroupAdditions);

      // Fetch registrant count for each cohort
      const counts: Record<string, number> = {};
      await Promise.all(
        ((settings as any).cohorts || []).map(async (c: string) => {
          try { counts[c] = (await getCohortCount(token, c)).count; } catch { counts[c] = 0; }
        })
      );
      setCohortCounts(counts);
      
      const adminList = await getAdmins(token);
      setAdmins(adminList);
    } catch (err: any) {
      setError('Failed to fetch settings: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndAdmins();
  }, []);

  const handleToggleFeedback = async () => {
    try {
      const res = await updateFeedbackSetting(token, !feedbackEnabled);
      setFeedbackEnabled(res.feedbackEnabled);
      toast.success(res.feedbackEnabled ? 'Feedback enabled' : 'Feedback disabled');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleToggleCohortFeedback = async (cohort: string) => {
    const isEnabled = feedbackEnabledCohorts.includes(cohort);
    try {
      const res = await toggleCohortFeedbackApi(token, cohort, !isEnabled);
      setFeedbackEnabledCohorts(res.feedbackEnabledCohorts || []);
      toast.success(`Feedback ${!isEnabled ? 'enabled' : 'disabled'} for cohort "${cohort}"`);
    } catch (err: any) {
      toast.error('Failed to update cohort feedback: ' + err.message);
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const res = await updateMaintenanceMode(token, !isMaintenance);
      setIsMaintenance(res.isMaintenanceMode);
      toast.success(res.isMaintenanceMode ? 'Maintenance active' : 'Maintenance disabled');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleToggleGroupAdditions = async () => {
    try {
      const res = await updateGroupAdditionsSetting(token, !allowProfileGroupAdditions);
      setAllowProfileGroupAdditions(!!res.allowProfileGroupAdditions);
      toast.success(res.allowProfileGroupAdditions ? 'Group additions from Profile enabled' : 'Group additions from Profile disabled');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleUpdateCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCap || newCap < 1) {
      toast.error('Invalid cap number');
      return;
    }
    try {
      const res = await updateRegistrationCap(token, Number(newCap));
      setRegistrationCap(res.registrationCap);
      toast.success('Registration cap updated to ' + res.registrationCap);
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refCode.trim() || !refLabel.trim()) {
      toast.error('Please enter both code and label.');
      return;
    }
    try {
      const res = await addReferralCode(token, refCode.trim(), refLabel.trim());
      setReferrals(res.referralCodes);
      setRefCode('');
      setRefLabel('');
      toast.success('Referral code added!');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleToggleReferral = async (code: string) => {
    try {
      const res = await toggleReferralCode(token, code);
      setReferrals(res.referralCodes);
      toast.success('Referral status updated');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleDeleteReferral = (code: string) => {
    setConfirmModal({
      message: `Are you sure you want to delete referral "${code}"?`,
      onConfirm: async () => {
        try {
          const res = await deleteReferralCode(token, code);
          setReferrals(res.referralCodes);
          toast.success(`Referral "${code}" deleted`);
        } catch (err: any) {
          toast.error('Failed: ' + err.message);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleStartEdit = (code: string, currentLabel: string) => {
    setEditingCode(code);
    setEditingLabel(currentLabel);
  };

  const handleSaveLabel = async (code: string) => {
    if (!editingLabel.trim()) {
      toast.error('Label cannot be empty.');
      return;
    }
    try {
      const res = await updateReferralLabel(token, code, editingLabel.trim());
      setReferrals(res.referralCodes);
      setEditingCode(null);
      setEditingLabel('');
      toast.success('Label updated');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingCode(null);
    setEditingLabel('');
  };

  const handleDeleteAdmin = (adminId: string) => {
    setConfirmModal({
      message: 'Are you sure you want to delete this admin account?',
      onConfirm: async () => {
        try {
          await deleteAdmin(token, adminId);
          setAdmins(admins.filter(a => a._id !== adminId));
          toast.success('Admin account deleted.');
        } catch (err: any) {
          toast.error('Failed: ' + err.message);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleAddCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortMonth || !newCohortDay1 || !newCohortDay2 || !newCohortYear) return;
    const cohortStr = `${newCohortMonth} ${newCohortDay1} & ${newCohortDay2}, ${newCohortYear}`;
    try {
      const settings = await addCohort(token, cohortStr);
      setCohorts(settings.cohorts || []);
      setActiveCohort(settings.activeCohort || '');
      // Fetch count for the new cohort
      try { setCohortCounts(prev => ({ ...prev, [cohortStr]: 0 })); } catch {}
      setNewCohortMonth(''); setNewCohortDay1(''); setNewCohortDay2('');
      setNewCohortYear(String(new Date().getFullYear()));
      toast.success('Cohort added successfully!');
    } catch (err: any) {
      toast.error('Failed to add cohort: ' + err.message);
    }
  };

  const handleDeleteCohort = async (cohort: string) => {
    try {
      const { count } = await getCohortCount(token, cohort);
      const isActive = cohort === activeCohort;

      if (count > 0 || isActive) {
        // Show migration modal
        setMigrationModal({ cohort, count, isActive, migrateTo: '' });
      } else {
        // No users affected — simple confirm
        setConfirmModal({
          message: `Delete cohort "${cohort}"? This action cannot be undone.`,
          onConfirm: async () => {
            try {
              const { settings } = await deleteCohort(token, cohort);
              setCohorts(settings.cohorts || []);
              setActiveCohort(settings.activeCohort || '');
              setCohortCounts(prev => { const n = { ...prev }; delete n[cohort]; return n; });
              toast.success(`Cohort "${cohort}" deleted.`);
            } catch (err: any) {
              toast.error('Failed to delete cohort: ' + err.message);
            }
            setConfirmModal(null);
          }
        });
      }
    } catch (err: any) {
      toast.error('Failed to fetch cohort info: ' + err.message);
    }
  };

  const handleConfirmMigrationDelete = async () => {
    if (!migrationModal) return;
    setMigrationLoading(true);
    try {
      const { cohort, migrateTo } = migrationModal;
      // migrateTo empty string = set users to null ("Will update soon")
      const { settings, affectedUsers } = await deleteCohort(token, cohort, migrateTo || '');
      setCohorts(settings.cohorts || []);
      setActiveCohort(settings.activeCohort || '');
      // Refresh counts
      const counts: Record<string, number> = {};
      await Promise.all(
        (settings.cohorts || []).map(async (c: string) => {
          try { counts[c] = (await getCohortCount(token, c)).count; } catch { counts[c] = 0; }
        })
      );
      setCohortCounts(counts);
      const msg = affectedUsers > 0
        ? migrateTo
          ? `Cohort deleted. ${affectedUsers} user(s) migrated to "${migrateTo}".`
          : `Cohort deleted. ${affectedUsers} user(s) set to "Will update soon".`
        : `Cohort "${cohort}" deleted.`;
      toast.success(msg);
      setMigrationModal(null);
    } catch (err: any) {
      toast.error('Failed to delete cohort: ' + err.message);
    } finally {
      setMigrationLoading(false);
    }
  };

  const handleSelectActiveCohort = async (cohort: string) => {
    try {
      const settings = await updateActiveCohort(token, cohort);
      setActiveCohort(settings.activeCohort || '');
      if (settings.activeCohort) {
        toast.success(`Active cohort updated to "${settings.activeCohort}"`);
      } else {
        toast.success('Active cohort cleared — no active cohort set.');
      }
    } catch (err: any) {
      toast.error('Failed to update active cohort: ' + err.message);
    }
  };


  if (loading) return <div className="admin-loading">Loading settings...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-page">
      <h2 className="admin-page-title">System Settings</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: Basic Toggles and Cap */}
        <div>
          {/* Toggles Card */}
          <div className="admin-card" style={{ marginBottom: '2rem' }}>
            <h3>System Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#2A1F14' }}>Maintenance Mode</div>
                  <div style={{ fontSize: '0.82rem', color: '#8C7B6B' }}>Lock the public site and show maintenance screen</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleToggleMaintenance}
                  style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: isMaintenance ? '#dc2626' : '#3B8BD4', borderColor: isMaintenance ? '#dc2626' : '#3B8BD4', color: '#fff' }}
                >
                  {isMaintenance ? 'Maintenance Active (Turn Off)' : 'Normal Mode (Turn On)'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #FAF7F2', paddingTop: '1.2rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#2A1F14' }}>Allow Profile Group Additions</div>
                  <div style={{ fontSize: '0.82rem', color: '#8C7B6B' }}>Allow registered users to add group members from their profile page</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleToggleGroupAdditions}
                  style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: allowProfileGroupAdditions ? '#2e7d32' : '#3B8BD4', borderColor: allowProfileGroupAdditions ? '#2e7d32' : '#3B8BD4', color: '#fff' }}
                >
                  {allowProfileGroupAdditions ? 'Allowed (Turn Off)' : 'Disabled (Turn On)'}
                </button>
              </div>
            </div>
          </div>

          {/* Cohort Feedback Enablement Card */}
          <div className="admin-card" style={{ marginBottom: '2rem' }}>
            <h3>Cohort Feedback Enablement</h3>
            <p style={{ fontSize: '0.82rem', color: '#8C7B6B', marginTop: '0.3rem', marginBottom: '1.2rem' }}>
              Enable or disable feedback forms (and certificate downloads) on a cohort-by-cohort basis.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cohorts.map(c => {
                const isEnabled = feedbackEnabledCohorts.includes(c);
                const completed = isCohortCompleted(c);
                return (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #FAF7F2', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#2A1F14', fontSize: '0.9rem' }}>
                        {c} 
                        {completed && <span style={{ color: '#8c8c8c', fontSize: '0.75rem', marginLeft: '5px' }}>(Completed)</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#8C7B6B' }}>
                        {isEnabled ? 'Users in this cohort can submit feedback' : 'Feedback form is disabled for this cohort'}
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => handleToggleCohortFeedback(c)}
                      style={{ padding: '5px 12px', fontSize: '12.5px', backgroundColor: isEnabled ? '#2e7d32' : '#3B8BD4', borderColor: isEnabled ? '#2e7d32' : '#3B8BD4', color: '#fff' }}
                    >
                      {isEnabled ? 'Enabled (Turn Off)' : 'Disabled (Turn On)'}
                    </button>
                  </div>
                );
              })}
              {cohorts.length === 0 && (
                <div style={{ color: '#8C7B6B', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No cohorts defined yet.
                </div>
              )}
            </div>
          </div>

          {/* Registration Cap Card */}
          <div className="admin-card" style={{ marginBottom: '2rem' }}>
            <h3>Waitlist / Registration Cap</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginTop: '0.3rem' }}>
              Current cap: <strong>{registrationCap}</strong> users. Once registered users reach this limit, new sign-ups are automatically waitlisted.
            </p>
            <form onSubmit={handleUpdateCap} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <input
                type="number"
                value={newCap}
                onChange={e => setNewCap(e.target.value ? Number(e.target.value) : '')}
                placeholder="New capacity limit"
                style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #E2D9CC', borderRadius: 4 }}
                required
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                Update Cap
              </button>
            </form>
          </div>

          {/* Cohort Dates Card */}
          <div className="admin-card" style={{ marginBottom: '2rem' }}>
            <h3>Manage Cohort Dates</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginTop: '0.3rem', marginBottom: '1.2rem' }}>
              Add/remove cohort dates and set which cohort new registrations are automatically assigned to.
            </p>

            {/* Active cohort selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', background: 'rgba(196,149,106,0.06)', border: '1px solid rgba(196,149,106,0.15)', padding: '0.75rem 1rem', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#2A1F14', fontSize: '0.9rem' }}>Active Cohort (New Users Target)</div>
                <div style={{ fontSize: '0.8rem', color: '#8C7B6B' }}>Select which cohort date registrations automatically map to</div>
              </div>
              <select
                value={activeCohort}
                onChange={e => handleSelectActiveCohort(e.target.value)}
                style={{ marginLeft: 'auto', padding: '0.4rem 0.6rem', border: '1px solid #E2D9CC', borderRadius: 4, background: '#fff' }}
              >
                <option value="">No Active Cohort</option>
                {cohorts.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Add cohort — date picker (two days) */}
            <form onSubmit={handleAddCohort} style={{ marginBottom: '1.25rem', background: '#faf8f5', border: '1px solid #E2D9CC', borderRadius: 8, padding: '1rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#5C4B3B', marginBottom: '0.6rem' }}>Add New Cohort Date</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Month */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#8C7B6B' }}>Month</label>
                  <select
                    value={newCohortMonth}
                    onChange={e => setNewCohortMonth(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.5rem', border: '1px solid #E2D9CC', borderRadius: 4, background: '#fff', fontSize: '0.88rem' }}
                  >
                    <option value="">Month</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {/* Day 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#8C7B6B' }}>Day 1</label>
                  <select
                    value={newCohortDay1}
                    onChange={e => setNewCohortDay1(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.5rem', border: '1px solid #E2D9CC', borderRadius: 4, background: '#fff', fontSize: '0.88rem', width: '70px' }}
                  >
                    <option value="">—</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <span style={{ paddingBottom: '0.35rem', color: '#8C7B6B', fontWeight: 700 }}>&amp;</span>
                {/* Day 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#8C7B6B' }}>Day 2</label>
                  <select
                    value={newCohortDay2}
                    onChange={e => setNewCohortDay2(e.target.value)}
                    required
                    style={{ padding: '0.4rem 0.5rem', border: '1px solid #E2D9CC', borderRadius: 4, background: '#fff', fontSize: '0.88rem', width: '70px' }}
                  >
                    <option value="">—</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* Year */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#8C7B6B' }}>Year</label>
                  <select
                    value={newCohortYear}
                    onChange={e => setNewCohortYear(e.target.value)}
                    style={{ padding: '0.4rem 0.5rem', border: '1px solid #E2D9CC', borderRadius: 4, background: '#fff', fontSize: '0.88rem' }}
                  >
                    {[2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.4rem 1rem', alignSelf: 'flex-end' }}
                  disabled={!newCohortMonth || !newCohortDay1 || !newCohortDay2}>
                  Add Cohort
                </button>
              </div>
              {/* Preview */}
              {newCohortMonth && newCohortDay1 && newCohortDay2 && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#5C4B3B' }}>
                  Preview: <strong>{newCohortMonth} {newCohortDay1} &amp; {newCohortDay2}, {newCohortYear}</strong>
                </div>
              )}
            </form>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cohort Date</th>
                    <th style={{ textAlign: 'center' }}>Registrants</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(c => {
                    const completed = isCohortCompleted(c);
                    const count = cohortCounts[c] ?? '…';
                    return (
                      <tr key={c}>
                        <td style={{ fontWeight: c === activeCohort ? 700 : 'normal' }}>
                          {c}
                          {c === activeCohort && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>Active</span>}
                          {completed && c !== activeCohort && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#f3f3f3', color: '#8c8c8c', borderRadius: 4, padding: '1px 6px' }}>Completed</span>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: '#3B2F2F' }}>{count}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteCohort(c)}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {cohorts.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#8C7B6B' }}>
                        No cohort dates defined yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


          {/* Admin Accounts List */}
          <div className="admin-card">
            <h3>Admin Accounts</h3>
            <div className="admin-table-container" style={{ marginTop: '1rem' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(adm => (
                    <tr key={adm._id}>
                      <td className="admin-row-name">{adm.fullName}</td>
                      <td className="admin-supporting-info">{adm.email}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteAdmin(adm._id)}
                          style={{
                            background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c',
                            padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem'
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Referral Codes CRUD */}
        <div>
          <div className="admin-card">
            <h3>Manage Referral Codes</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginTop: '0.3rem', marginBottom: '1.2rem' }}>
              Add and manage marketing codes that attribute registrations.
            </p>

            {/* Add referral code form */}
            <form onSubmit={handleAddReferral} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                value={refCode}
                onChange={e => setRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="code (e.g. gkt06)"
                style={{ padding: '0.5rem 0.75rem', border: '1px solid #E2D9CC', borderRadius: 4 }}
                required
              />
              <input
                type="text"
                value={refLabel}
                onChange={e => setRefLabel(e.target.value)}
                placeholder="Label (e.g. Chetana N)"
                style={{ padding: '0.5rem 0.75rem', border: '1px solid #E2D9CC', borderRadius: 4 }}
                required
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                Add Code
              </button>
            </form>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Label</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(ref => (
                    <tr key={ref.code}>
                      <td className="admin-row-name" style={{ fontFamily: 'monospace' }}>{ref.code}</td>
                      <td className="admin-supporting-info">
                        {editingCode === ref.code ? (
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={e => setEditingLabel(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(ref.code); if (e.key === 'Escape') handleCancelEdit(); }}
                              autoFocus
                              style={{ flex: 1, padding: '3px 8px', border: '1px solid #3B8BD4', borderRadius: 4, fontSize: '0.85rem', minWidth: 0 }}
                            />
                            <button
                              onClick={() => handleSaveLabel(ref.code)}
                              style={{ background: '#3B8BD4', border: 'none', color: '#fff', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                            >Save</button>
                            <button
                              onClick={handleCancelEdit}
                              style={{ background: 'transparent', border: '1px solid #ccc', color: '#666', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem' }}
                            >✕</button>
                          </div>
                        ) : (
                          ref.label
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleReferral(ref.code)}
                          className={`admin-badge ${ref.isActive ? 'success' : 'danger'}`}
                          style={{ cursor: 'pointer', borderStyle: 'solid' }}
                        >
                          {ref.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleStartEdit(ref.code, ref.label)}
                            style={{ background: 'transparent', border: 'none', color: '#3B8BD4', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                          >
                            Edit
                          </button>
                          <span style={{ color: '#ddd' }}>|</span>
                          <button
                            onClick={() => handleDeleteReferral(ref.code)}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {referrals.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#8C7B6B' }}>
                        No referral codes defined yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>

      </div>
      
      {/* ── Confirmation Modal ── */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Confirm Action</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.5rem' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #c8bdb0', borderRadius: 6, background: '#f8f6f2', color: '#4a3f35', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmModal.onConfirm}
                className="btn-primary" 
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Migration Modal (cohort delete with users) ── */}
      {migrationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '480px' }}>
            <h3 style={{ marginBottom: '0.4rem', color: '#3B2F2F' }}>Delete Cohort: "{migrationModal.cohort}"</h3>

            {migrationModal.isActive && (
              <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '0.6rem 0.9rem', marginBottom: '0.75rem', fontSize: '0.83rem', color: '#856404' }}>
                ⚠️ This is currently the <strong>active cohort</strong>. It will be cleared after deletion.
              </div>
            )}

            {migrationModal.count > 0 && (
              <p style={{ fontSize: '0.88rem', color: '#5C4B3B', marginBottom: '1rem' }}>
                <strong>{migrationModal.count} registered user(s)</strong> are on this cohort. What should happen to them?
              </p>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#3B2F2F', marginBottom: '0.4rem' }}>
                Migrate these users to:
              </label>
              <select
                value={migrationModal.migrateTo}
                onChange={e => setMigrationModal(prev => prev ? { ...prev, migrateTo: e.target.value } : prev)}
                style={{ width: '100%', padding: '0.45rem 0.7rem', border: '1px solid #E2D9CC', borderRadius: 6, fontSize: '0.9rem', background: '#fff' }}
              >
                <option value="">No date — show "Will update soon"</option>
                {cohorts.filter(c => c !== migrationModal.cohort).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setMigrationModal(null)}
                disabled={migrationLoading}
                style={{ padding: '0.5rem 1rem', border: '1px solid #c8bdb0', borderRadius: 6, background: '#f8f6f2', color: '#4a3f35', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMigrationDelete}
                disabled={migrationLoading}
                className="btn-primary"
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                {migrationLoading ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
