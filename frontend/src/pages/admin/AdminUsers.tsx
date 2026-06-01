import React, { useEffect, useState } from 'react';
import {
  getAdminUsers,
  retryZoomRegistration,
  retryEmailConfirmation,
  editAdminUser,
  toggleUserStatus,
  toggleUserWaitlist,
  manualConfirmPayment,
  getAdminSettings,
  createAdminUser
} from '../../lib/api';
import { CertificateGenerator } from '../../components/admin/CertificateGenerator';
import { toast } from 'sonner';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function IdCardLink({ path }: { path: string | null }) {
  if (!path) return <span style={{ color: '#bbb' }}>—</span>;
  const url = `${API_BASE}/uploads/${path}`;
  const isImage = /\.(jpg|jpeg|png)$/i.test(path);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {isImage && (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt="ID Card"
            style={{
              width: 80, height: 56, objectFit: 'cover',
              borderRadius: 6, border: '1.5px solid rgba(59, 139, 212, 0.2)', cursor: 'pointer',
            }}
          />
        </a>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: '0.78rem', color: '#3B8BD4', textDecoration: 'underline' }}
      >
        {isImage ? 'View full' : 'View PDF'}
      </a>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid #E2E8F0' }}>
      <span style={{ color: '#64748B', minWidth: 130, fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#0F172A' }}>{value || '—'}</span>
    </div>
  );
}

function formatReferral(ref: string | null | undefined): string {
  if (!ref || ref === '-') return '-';
  if (ref.includes(' - ')) {
    return ref.split(' - ')[1];
  }
  return ref;
}

function getMissingFields(user: any) {
  const missing: string[] = [];
  
  if (!user.phone || user.phone === '-' || user.phone.trim() === '') {
    missing.push('Phone Number');
  }
  
  if (!user.userType || user.userType === '-' || user.userType.trim() === '') {
    missing.push('Account Type');
  } else if (user.userType === 'student') {
    if (!user.collegeName || user.collegeName === '-' || user.collegeName.trim() === '') {
      missing.push('College Name');
    }
    if (!user.course || user.course === '-' || user.course.trim() === '') {
      missing.push('Course');
    }
    if (!user.year || user.year === '-' || user.year.trim() === '') {
      missing.push('Year of Study');
    }
    const isInstitutionalEmail = /\.(ac|edu)\.in$/i.test(user.email || '');
    if (!isInstitutionalEmail && !user.idCardPath) {
      missing.push('College ID Card');
    }
  } else if (user.userType === 'working') {
    if (!user.domain || user.domain === '-' || user.domain.trim() === '') {
      missing.push('Domain / Industry');
    }
  }
  
  if (!user.heardFrom || user.heardFrom === '-' || user.heardFrom.trim() === '') {
    missing.push('How did you hear about us?');
  }
  
  return missing;
}

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRegistrants, setTotalRegistrants] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [filterPaid, setFilterPaid] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterWaitlist, setFilterWaitlist] = useState('all');
  const [filterReferral, setFilterReferral] = useState('all');
  const [filterHeardFrom, setFilterHeardFrom] = useState('all');
  const [filterCohort, setFilterCohort] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [certificateUser, setCertificateUser] = useState<any>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    collegeName: '',
    course: '',
    year: '',
    domain: '',
    organization: '',
    heardFrom: '',
    referralCode: '',
    selectedCohort: ''
  });

  // Manual Payment Confirmation State
  const [paymentConfirmUser, setPaymentConfirmUser] = useState<any>(null);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState('');

  // Status Confirm State
  const [statusConfirmUser, setStatusConfirmUser] = useState<any>(null);

  // Add Registrant Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    userType: '', // '', 'student', or 'working'
    referralCode: ''
  });

  const adminToken = localStorage.getItem('adminToken') || '';

  // Load referral codes list from settings
  useEffect(() => {
    getAdminSettings(adminToken)
      .then(settings => {
        setReferralsList(settings.referralCodes || []);
      })
      .catch(console.error);
  }, [adminToken]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filterPaid, filterType, filterWaitlist, filterReferral, filterHeardFrom, sortOrder, filterCohort]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers(adminToken, {
        page,
        limit,
        search: debouncedSearchTerm,
        filterPaid,
        filterType,
        filterWaitlist,
        filterReferral,
        filterHeardFrom,
        filterCohort,
        sortOrder
      });
      setUsers(data.data || []);
      setTotal(data.total || 0);
      setTotalRegistrants(data.totalRegistrants || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError('Failed to load users. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearchTerm, filterPaid, filterType, filterWaitlist, filterReferral, filterHeardFrom, sortOrder, filterCohort, adminToken]);

  const handleExportCSV = async () => {
    try {
      const response = await getAdminUsers(adminToken, {
        search: debouncedSearchTerm,
        filterPaid,
        filterType,
        filterWaitlist,
        filterReferral,
        filterHeardFrom,
        filterCohort,
        exportCsv: 'true',
        sortOrder
      });
      const exportUsers = response.data || [];
      
      if (exportUsers.length === 0) {
        toast.info('No users found for export.');
        return;
      }
      const headers = [
        'Name', 'Email', 'Phone', 'Type', 'Selected Date',
        'College', 'Course', 'Year',
        'Domain', 'Organization',
        'Waitlisted', 'Active', 'Heard From', 'Referral Code',
        'Payment Status', 'Payment ID', 'Profile Status', 'Registered On'
      ];
      const rows = exportUsers.map((u: any) => [
        `"${u.fullName}"`, `"${u.email}"`, `"${u.phone}"`, `"${u.userType}"`,
        `"${u.selectedCohort || '-'}"`,
        `"${u.collegeName}"`, `"${u.course}"`, `"${u.year}"`,
        `"${u.domain}"`, `"${u.organization}"`,
        u.isWaitlisted ? 'Yes' : 'No', u.isActive ? 'Active' : 'Inactive', `"${u.heardFrom || '-'}"`, `"${u.referralCode || '-'}"`,
        u.isPaid ? 'Paid' : 'Unpaid',
        `"${u.paymentId || '-'}"`,
        u.isProfileComplete ? 'Complete' : 'Partially Filled',
        `"${new Date(u.createdAt).toLocaleString()}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lead_with_ai_users.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleRetry = async (userId: string, type: 'zoom' | 'email') => {
    try {
      if (type === 'zoom') {
        await retryZoomRegistration(adminToken, userId);
      } else {
        await retryEmailConfirmation(adminToken, userId);
      }
      toast.success(`${type.toUpperCase()} retry successful!`);
      setUsers(users.map(u => u.id === userId ? { ...u, [type === 'zoom' ? 'zoomStatus' : 'emailStatus']: 'success' } : u));
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!statusConfirmUser) return;
    try {
      const res = await toggleUserStatus(adminToken, statusConfirmUser.id);
      setUsers(users.map(u => u.id === statusConfirmUser.id ? { ...u, isActive: res.isActive } : u));
      setStatusConfirmUser(null);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(`Failed to change user status: ${err.message}`);
    }
  };

  const handleToggleWaitlistStatus = async (userId: string) => {
    try {
      const res = await toggleUserWaitlist(adminToken, userId);
      toast.success(res.message);
      setUsers(users.map(u => u.id === userId ? { ...u, isWaitlisted: res.isWaitlisted } : u));
    } catch (err: any) {
      toast.error(`Failed to change waitlist status: ${err.message}`);
    }
  };

  const handleOpenEditModal = (user: any) => {
    const matchingReferral = referralsList.find(
      (r: any) => r.label === user.referralCode || r.code === user.referralCode
    );
    const resolvedCode = matchingReferral ? matchingReferral.code : '';

    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      collegeName: user.collegeName === '-' ? '' : user.collegeName,
      course: user.course === '-' ? '' : user.course,
      year: user.year === '-' ? '' : user.year,
      domain: user.domain === '-' ? '' : user.domain,
      organization: user.organization === '-' ? '' : user.organization,
      heardFrom: user.heardFrom === '-' ? '' : user.heardFrom,
      referralCode: resolvedCode,
      selectedCohort: user.selectedCohort || ''
    });
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await editAdminUser(adminToken, editingUser.id, editForm);
      toast.success('User details updated successfully.');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(`Failed to update user: ${err.message}`);
    }
  };

  const handleConfirmManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConfirmUser || !razorpayPaymentId.trim()) return;
    try {
      const res = await manualConfirmPayment(adminToken, paymentConfirmUser.id, razorpayPaymentId.trim());
      toast.success(res.message);
      setPaymentConfirmUser(null);
      setRazorpayPaymentId('');
      fetchUsers();
    } catch (err: any) {
      toast.error(`Failed to confirm payment: ${err.message}`);
    }
  };

  const handleAddRegistrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName.trim() || !addForm.email.trim()) {
      toast.error('Please enter name and email.');
      return;
    }
    try {
      const payload: any = {
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim().toLowerCase()
      };
      if (addForm.userType) {
        payload.userType = addForm.userType;
      }
      if (addForm.referralCode) {
        payload.referralCode = addForm.referralCode;
      }
      await createAdminUser(adminToken, payload);
      toast.success('Registrant created successfully!');
      setIsAddModalOpen(false);
      setAddForm({ fullName: '', email: '', userType: '', referralCode: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create registrant.');
    }
  };

  const toggleRow = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">User Management</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
            Add Registrant
          </button>
          <button className="btn-primary" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          background: '#fff', border: '2px solid rgba(59, 139, 212, 0.15)', borderRadius: 10,
          padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1
        }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0F172A' }}>{totalRegistrants}</span>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Registrants</span>
        </div>
        <div style={{
          background: '#fff', border: '2px solid rgba(59, 139, 212, 0.15)', borderRadius: 10,
          padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1
        }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0F172A' }}>{total}</span>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filtered Total</span>
        </div>
      </div>

      <div className="admin-controls">
        <input
          type="text"
          placeholder="Search name, email, college, org..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="admin-search-input"
        />
        <select value={filterPaid} onChange={e => setFilterPaid(e.target.value)} className="admin-select">
          <option value="all">All Payment Status</option>
          <option value="paid">Paid Only</option>
          <option value="unpaid">Unpaid Only</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="admin-select">
          <option value="all">All Types</option>
          <option value="student">Students</option>
          <option value="working">Professionals</option>
        </select>
        <select value={filterHeardFrom} onChange={e => setFilterHeardFrom(e.target.value)} className="admin-select">
          <option value="all">All Sources</option>
          <option value="social media">Social Media</option>
          <option value="newspaper">Newspaper</option>
          <option value="others">Others</option>
        </select>
        <select value={filterWaitlist} onChange={e => setFilterWaitlist(e.target.value)} className="admin-select">
          <option value="all">All Cohorts</option>
          <option value="regular">First 1000</option>
          <option value="waitlisted">Waitlisted</option>
        </select>
        <select value={filterReferral} onChange={e => setFilterReferral(e.target.value)} className="admin-select">
          <option value="all">All Referrals</option>
          {referralsList.map(r => (
            <option key={r.code} value={r.label}>{r.label}</option>
          ))}
        </select>
        <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)} className="admin-select">
          <option value="all">All Dates</option>
          <option value="June 6 & 7, 2026">June 6 & 7, 2026</option>
          <option value="June 13 & 14, 2026">June 13 & 14, 2026</option>
          <option value="June 20 & 21, 2026">June 20 & 21, 2026</option>
          <option value="June 27 & 28, 2026">June 27 & 28, 2026</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '50px' }}>S.No.</th>
                <th>Name</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Phone</th>
                <th style={{ textAlign: 'center' }}>Type</th>
                <th>College / Organization</th>
                <th style={{ textAlign: 'center' }}>Referral</th>
                <th style={{ textAlign: 'center' }}>Payment</th>
                <th style={{ textAlign: 'center' }}>Heard From</th>
                <th style={{ textAlign: 'center' }}>Preferred Date</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any, index: number) => (
                <React.Fragment key={user.id}>
                  <tr style={{ cursor: 'pointer', opacity: user.isActive ? 1 : 0.55 }} onClick={() => toggleRow(user.id)}>
                    <td className="admin-supporting-info" style={{ textAlign: 'center', fontWeight: 600 }}>
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="admin-row-name">{user.fullName}</td>
                    <td className="admin-supporting-info">{user.email}</td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center' }}>{user.phone}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="admin-badge" style={{
                        background: user.userType === 'student' ? 'rgba(59,139,212,0.08)' : 'rgba(71,85,105,0.08)',
                        color: user.userType === 'student' ? '#3B8BD4' : '#475569',
                        border: `1px solid ${user.userType === 'student' ? 'rgba(59,139,212,0.2)' : 'rgba(71,85,105,0.2)'}`,
                      }}>
                        {user.userType === 'student' ? 'Student' : 'Professional'}
                      </span>
                    </td>
                    <td className="admin-supporting-info">
                      {user.userType === 'student' ? user.collegeName : user.organization}
                    </td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center' }}>{formatReferral(user.referralCode)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`admin-badge ${user.isPaid ? 'success' : 'warning'}`}>
                        {user.isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center' }}>
                      {user.heardFrom || '-'}
                    </td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center' }}>{user.selectedCohort || '-'}</td>
                  </tr>

                  {expandedId === user.id && (
                    <tr>
                      <td colSpan={10} style={{ background: '#F0F4F8', padding: '1.2rem 2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: user.userType === 'student' && user.idCardPath ? '1fr 1fr 180px' : '1fr 1fr', gap: '1.5rem' }}>
                          
                          {/* Profile completion check */}
                          {!user.isProfileComplete && (
                            <div style={{
                              gridColumn: '1 / -1',
                              background: '#fff',
                              border: '1.5px solid rgba(59, 139, 212, 0.2)',
                              borderRadius: '8px',
                              padding: '1rem',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                            }}>
                              <div style={{ color: '#3B8BD4', display: 'flex', alignItems: 'center', height: '20px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                  <line x1="12" y1="9" x2="12" y2="13"/>
                                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 0.25rem 0', color: '#0F172A', fontSize: '0.92rem', fontWeight: 700 }}>Incomplete Profile Details</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', lineHeight: '1.4' }}>
                                  The registrant has not completed their profile yet. Missing fields: <strong style={{ color: '#0F172A' }}>{getMissingFields(user).join(', ') || 'None'}</strong>.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Personal */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Personal Details
                            </div>
                            <DetailRow label="Full Name" value={user.fullName} />
                            <DetailRow label="Email" value={user.email} />
                            <DetailRow label="Phone" value={user.phone} />
                            <DetailRow label="User Type" value={user.userType === 'student' ? 'Student' : 'Working Professional'} />
                            <DetailRow label="Registered On" value={new Date(user.createdAt).toLocaleString()} />
                            <DetailRow label="Heard From" value={user.heardFrom} />
                            <DetailRow label="Selected Date" value={user.selectedCohort || '-'} />
                            
                            {/* Controls Panel */}
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                className="btn-primary"
                                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(user); }}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setStatusConfirmUser(user); }}
                                style={{
                                  padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 6,
                                  background: user.isActive ? '#fee2e2' : '#dcfce7',
                                  border: `1px solid ${user.isActive ? '#fca5a5' : '#bbf7d0'}`,
                                  color: user.isActive ? '#b91c1c' : '#15803d'
                                }}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleWaitlistStatus(user.id); }}
                                style={{
                                  padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 6,
                                  background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309'
                                }}
                              >
                                {user.isWaitlisted ? 'Remove from Waitlist' : 'Add to Waitlist'}
                              </button>
                            </div>
                          </div>

                          {/* Academic/Professional + Payment */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {user.userType === 'student' ? 'Academic Details' : 'Professional Details'}
                            </div>
                            {user.userType === 'student' ? (
                              <>
                                <DetailRow label="College" value={user.collegeName} />
                                <DetailRow label="Course" value={user.course} />
                                <DetailRow label="Year" value={user.year} />
                              </>
                            ) : (
                              <>
                                <DetailRow label="Domain" value={user.domain} />
                                <DetailRow label="Organization" value={user.organization} />
                              </>
                            )}

                            <div style={{ marginTop: '0.8rem' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Payment
                              </div>
                              <DetailRow label="Status" value={
                                <span className={`admin-badge ${user.isPaid ? 'success' : 'warning'}`}>
                                  {user.isPaid ? 'Paid' : 'Pending'}
                                </span>
                              } />
                              
                              {user.isPaid && user.paymentId && user.paymentId !== '-' && (
                                <DetailRow label="Payment ID" value={
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{user.paymentId}</span>
                                } />
                              )}

                              {!user.isPaid && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <button
                                    className="btn-primary"
                                    onClick={(e) => { e.stopPropagation(); setPaymentConfirmUser(user); }}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                                  >
                                    Manually Confirm Payment
                                  </button>
                                </div>
                              )}

                              {user.isPaid && (
                                <>
                                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(59, 139, 212, 0.15)', alignItems: 'center' }}>
                                    <span style={{ color: '#64748B', minWidth: 130, fontWeight: 600 }}>Zoom Status</span>
                                    <span className={`admin-badge ${user.zoomStatus === 'success' ? 'success' : user.zoomStatus === 'failed' ? 'danger' : 'warning'}`} style={{ backgroundColor: user.zoomStatus === 'failed' ? '#fee2e2' : undefined, color: user.zoomStatus === 'failed' ? '#dc2626' : undefined }}>
                                      {user.zoomStatus}
                                    </span>
                                    {user.zoomStatus === 'failed' && (
                                      <button onClick={() => handleRetry(user.id, 'zoom')} style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626' }}>Retry</button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(59, 139, 212, 0.15)', alignItems: 'center' }}>
                                    <span style={{ color: '#64748B', minWidth: 130, fontWeight: 600 }}>Email Status</span>
                                    <span className={`admin-badge ${user.emailStatus === 'success' ? 'success' : user.emailStatus === 'failed' ? 'danger' : 'warning'}`} style={{ backgroundColor: user.emailStatus === 'failed' ? '#fee2e2' : undefined, color: user.emailStatus === 'failed' ? '#dc2626' : undefined }}>
                                      {user.emailStatus}
                                    </span>
                                    {user.emailStatus === 'failed' && (
                                      <button onClick={() => handleRetry(user.id, 'email')} style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626' }}>Retry</button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {user.isPaid && (
                              <div style={{ marginTop: '1rem' }}>
                                <button
                                  className="btn-primary"
                                  onClick={(e) => { e.stopPropagation(); setCertificateUser(user); }}
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                >
                                  Generate Certificate
                                </button>
                              </div>
                            )}
                          </div>

                          {/* ID Card */}
                          {user.userType === 'student' && (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                ID Card
                              </div>
                              <IdCardLink path={user.idCardPath} />
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#8C7B6B' }}>
                    No users found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid rgba(59, 139, 212, 0.2)', backgroundColor: '#F0F4F8' }}>
              <div style={{ fontSize: '0.88rem', color: '#64748B' }}>
                Showing page <span style={{ fontWeight: 600, color: '#0F172A' }}>{page}</span> of <span style={{ fontWeight: 600, color: '#0F172A' }}>{totalPages}</span> ({total} total)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(59, 139, 212, 0.2)', backgroundColor: page === 1 ? '#E2E8F0' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#64748B' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(59, 139, 212, 0.2)', backgroundColor: page === totalPages ? '#E2E8F0' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#64748B' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#3B2F2F' }}>Edit User Details</h3>
            <form onSubmit={handleSaveUserEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>

              {editingUser.userType === 'student' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>College Name</label>
                    <input
                      type="text"
                      value={editForm.collegeName}
                      onChange={e => setEditForm({ ...editForm, collegeName: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Course</label>
                    <input
                      type="text"
                      value={editForm.course}
                      onChange={e => setEditForm({ ...editForm, course: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Year</label>
                    <input
                      type="text"
                      value={editForm.year}
                      onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Domain</label>
                    <input
                      type="text"
                      value={editForm.domain}
                      onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Organization</label>
                    <input
                      type="text"
                      value={editForm.organization}
                      onChange={e => setEditForm({ ...editForm, organization: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>How did you hear about this?</label>
                <input
                  type="text"
                  value={editForm.heardFrom}
                  onChange={e => setEditForm({ ...editForm, heardFrom: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Selected Date *</label>
                <select
                  value={editForm.selectedCohort}
                  onChange={e => setEditForm({ ...editForm, selectedCohort: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                  required
                >
                  <option value="June 6 & 7, 2026">June 6 & 7, 2026</option>
                  <option value="June 13 & 14, 2026">June 13 & 14, 2026</option>
                  <option value="June 20 & 21, 2026">June 20 & 21, 2026</option>
                  <option value="June 27 & 28, 2026">June 27 & 28, 2026</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Referral Code</label>
                <select
                  value={editForm.referralCode}
                  onChange={e => setEditForm({ ...editForm, referralCode: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                >
                  <option value="">None</option>
                  {referralsList.map((r: any) => (
                    <option key={r.code} value={r.code}>
                      {r.label}{r.isActive === false ? ' (Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', gridColumn: 'span 2', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Confirmation Modal ── */}
      {statusConfirmUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Confirm {statusConfirmUser.isActive ? 'Deactivation' : 'Activation'}</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.5rem' }}>
              Are you sure you want to {statusConfirmUser.isActive ? 'deactivate' : 'activate'} <strong>{statusConfirmUser.fullName}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleToggleStatusConfirm}
                className="btn-primary" 
                style={{ padding: '0.5rem 1.5rem', backgroundColor: statusConfirmUser.isActive ? '#dc2626' : '#16a34a', borderColor: statusConfirmUser.isActive ? '#dc2626' : '#16a34a' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Payment Confirmation Modal ── */}
      {paymentConfirmUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Confirm Payment Manually</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.2rem' }}>
              Confirm payment for <strong>{paymentConfirmUser.fullName}</strong>. A Razorpay Payment ID is required.
            </p>
            <form onSubmit={handleConfirmManualPayment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Razorpay Payment ID</label>
                <input
                  type="text"
                  value={razorpayPaymentId}
                  onChange={e => setRazorpayPaymentId(e.target.value)}
                  placeholder="pay_xyz123abc"
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setPaymentConfirmUser(null); setRazorpayPaymentId(''); }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {certificateUser && (
        <CertificateGenerator
          user={certificateUser}
          onClose={() => setCertificateUser(null)}
        />
      )}

      {/* ── Add Registrant Modal ── */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '450px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Add New Registrant</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.2rem' }}>
              Create an account with minimal details. The registrant can complete their profile on first login.
            </p>
            <form onSubmit={handleAddRegistrantSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Full Name *</label>
                <input
                  type="text"
                  value={addForm.fullName}
                  onChange={e => setAddForm({ ...addForm, fullName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Email Address *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="e.g. rahul@gmail.com"
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Account Type</label>
                <select
                  value={addForm.userType}
                  onChange={e => setAddForm({ ...addForm, userType: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                >
                  <option value="">Let Registrant Decide</option>
                  <option value="student">Student</option>
                  <option value="working">Working Professional / Others</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Referral Code</label>
                <select
                  value={addForm.referralCode}
                  onChange={e => setAddForm({ ...addForm, referralCode: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                >
                  <option value="">None</option>
                  {referralsList.filter((r: any) => r.isActive !== false).map((r: any) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setAddForm({ fullName: '', email: '', userType: '', referralCode: '', selectedCohort: '' }); }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  Create Registrant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
