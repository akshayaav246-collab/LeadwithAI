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
  deleteAdmin
} from '../../lib/api';
import { toast } from 'sonner';

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [registrationCap, setRegistrationCap] = useState(1000);
  const [newCap, setNewCap] = useState<number | ''>('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  
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
      setIsMaintenance(settings.isMaintenanceMode);
      setRegistrationCap(settings.registrationCap);
      setNewCap(settings.registrationCap);
      setReferrals(settings.referralCodes || []);
      
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

  const handleToggleMaintenance = async () => {
    try {
      const res = await updateMaintenanceMode(token, !isMaintenance);
      setIsMaintenance(res.isMaintenanceMode);
      toast.success(res.isMaintenanceMode ? 'Maintenance active' : 'Maintenance disabled');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleUpdateCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCap || newCap < 1) return toast.error('Invalid cap number');
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
    if (!refCode.trim() || !refLabel.trim()) return toast.error('Please enter both code and label.');
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
    if (!editingLabel.trim()) return toast.error('Label cannot be empty.');
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
                  <div style={{ fontWeight: 600, color: '#2A1F14' }}>Post-Session Feedback</div>
                  <div style={{ fontSize: '0.82rem', color: '#8C7B6B' }}>Allow users to submit workshop feedback and get certificates</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleToggleFeedback}
                  style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: feedbackEnabled ? '#2e7d32' : '#C4956A', borderColor: feedbackEnabled ? '#2e7d32' : '#C4956A' }}
                >
                  {feedbackEnabled ? 'Enabled (Turn Off)' : 'Disabled (Turn On)'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #FAF7F2', paddingTop: '1.2rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#2A1F14' }}>Maintenance Mode</div>
                  <div style={{ fontSize: '0.82rem', color: '#8C7B6B' }}>Lock the public site and show maintenance screen</div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleToggleMaintenance}
                  style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: isMaintenance ? '#dc2626' : '#C4956A', borderColor: isMaintenance ? '#dc2626' : '#C4956A' }}
                >
                  {isMaintenance ? 'Maintenance Active (Turn Off)' : 'Normal Mode (Turn On)'}
                </button>
              </div>
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
                              style={{ flex: 1, padding: '3px 8px', border: '1px solid #C4956A', borderRadius: 4, fontSize: '0.85rem', minWidth: 0 }}
                            />
                            <button
                              onClick={() => handleSaveLabel(ref.code)}
                              style={{ background: '#C4956A', border: 'none', color: '#fff', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
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
                            style={{ background: 'transparent', border: 'none', color: '#C4956A', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
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
                style={{ padding: '0.5rem 1rem', border: '1px solid #E2D9CC', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
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
    </div>
  );
}
