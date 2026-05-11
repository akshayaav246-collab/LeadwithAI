import React, { useEffect, useState } from 'react';
import { getAdminUsers } from '../../lib/api';

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
              borderRadius: 6, border: '1.5px solid #E2D9CC', cursor: 'pointer',
            }}
          />
        </a>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: '0.78rem', color: '#C4956A', textDecoration: 'underline' }}
      >
        {isImage ? 'View full' : 'View PDF'}
      </a>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid #F0EBE1' }}>
      <span style={{ color: '#8C7B6B', minWidth: 130, fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#2A1F14' }}>{value || '—'}</span>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaid, setFilterPaid] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const data = await getAdminUsers(token);
        data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUsers(data);
      } catch (err: any) {
        setError('Failed to load users. ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleExportCSV = () => {
    if (users.length === 0) return;
    const headers = [
      'Name', 'Email', 'Phone', 'Type',
      'College', 'Course', 'Year',
      'Domain', 'Organization',
      'Payment Status', 'Payment ID', 'Registered On'
    ];
    const rows = users.map(u => [
      `"${u.fullName}"`, `"${u.email}"`, `"${u.phone}"`, `"${u.userType}"`,
      `"${u.collegeName}"`, `"${u.course}"`, `"${u.year}"`,
      `"${u.domain}"`, `"${u.organization}"`,
      u.isPaid ? 'Paid' : 'Unpaid',
      `"${u.paymentId || '-'}"`,
      `"${new Date(u.createdAt).toLocaleString()}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'lead_with_ai_users.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => {
    if (filterPaid === 'paid' && !u.isPaid) return false;
    if (filterPaid === 'unpaid' && u.isPaid) return false;
    if (filterType !== 'all' && u.userType !== filterType) return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(t) ||
        u.email.toLowerCase().includes(t) ||
        (u.collegeName && u.collegeName.toLowerCase().includes(t)) ||
        (u.organization && u.organization.toLowerCase().includes(t))
      );
    }
    return true;
  });

  const toggleRow = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">User Management</h2>
        <button className="btn-primary" onClick={handleExportCSV}>
          Export CSV
        </button>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', count: users.length, color: '#3B2F2F' },
          { label: 'Paid', count: users.filter(u => u.isPaid).length, color: '#16a34a' },
          { label: 'Unpaid', count: users.filter(u => !u.isPaid).length, color: '#b45309' },
          { label: 'Students', count: users.filter(u => u.userType === 'student').length, color: '#1d4ed8' },
          { label: 'Professionals', count: users.filter(u => u.userType === 'working').length, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '2px solid #E2D9CC', borderRadius: 10,
            padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center',
          }}>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: '0.8rem', color: '#8C7B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
          </div>
        ))}
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
                <th></th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>College / Domain</th>
                <th>Payment</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <React.Fragment key={user.id}>
                  {/* Main row */}
                  <tr
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleRow(user.id)}
                  >
                    <td style={{ width: 32, textAlign: 'center', color: '#C4956A', fontSize: '0.8rem' }}>
                      {expandedId === user.id ? '▲' : '▼'}
                    </td>
                    <td style={{ fontWeight: 500 }}>{user.fullName}</td>
                    <td style={{ fontSize: '0.88rem' }}>{user.email}</td>
                    <td style={{ fontSize: '0.88rem' }}>{user.phone}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: user.userType === 'student' ? 'rgba(29,78,216,0.1)' : 'rgba(124,58,237,0.1)',
                        color: user.userType === 'student' ? '#1d4ed8' : '#7c3aed',
                        border: `1px solid ${user.userType === 'student' ? 'rgba(29,78,216,0.2)' : 'rgba(124,58,237,0.2)'}`,
                        textTransform: 'capitalize',
                      }}>
                        {user.userType === 'student' ? 'Student' : 'Professional'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.userType === 'student' ? user.collegeName : user.domain}
                    </td>
                    <td>
                      <span className={`admin-badge ${user.isPaid ? 'success' : 'warning'}`}>
                        {user.isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === user.id && (
                    <tr>
                      <td colSpan={8} style={{ background: '#FAF7F2', padding: '1.2rem 2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: user.userType === 'student' && user.idCardPath ? '1fr 1fr 180px' : '1fr 1fr', gap: '1.5rem' }}>

                          {/* Left column - Personal */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#3B2F2F', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Personal Details
                            </div>
                            <DetailRow label="Full Name" value={user.fullName} />
                            <DetailRow label="Email" value={user.email} />
                            <DetailRow label="Phone" value={user.phone} />
                            <DetailRow label="User Type" value={user.userType === 'student' ? 'Student' : 'Working Professional'} />
                            <DetailRow label="Registered On" value={new Date(user.createdAt).toLocaleString()} />
                          </div>

                          {/* Right column - Type-specific */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#3B2F2F', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                              <div style={{ fontWeight: 700, color: '#3B2F2F', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                            </div>
                          </div>

                          {/* ID Card column (students only) */}
                          {user.userType === 'student' && (
                            <div>
                              <div style={{ fontWeight: 700, color: '#3B2F2F', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#8C7B6B' }}>
                    No users found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
