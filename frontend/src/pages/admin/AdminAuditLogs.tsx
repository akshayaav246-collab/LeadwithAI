import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../../lib/api';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const limit = 50;

  const adminToken = localStorage.getItem('adminToken') || '';

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit };
      if (fromDate) params.from = fromDate;
      if (toDate)   params.to   = toDate;
      const data = await getAuditLogs(adminToken, params);
      setLogs(data.data || data);
      setTotal(data.total ?? (data.data || data).length);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      setError('Failed to load audit logs. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(page); }, [page]);

  const handleFilter = () => { setPage(1); fetchLogs(1); };

  const handleClear = () => {
    setFromDate(''); setToDate(''); setPage(1);
    setTimeout(() => fetchLogs(1), 0);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DELETE_USER':      return '#dc2626';
      case 'SEND_BULK_EMAIL':  return '#2563eb';
      case 'RETRY_ZOOM':       return '#16a34a';
      case 'RETRY_EMAIL':      return '#16a34a';
      case 'TOGGLE_MAINTENANCE': return '#d97706';
      case 'TOGGLE_FEEDBACK':  return '#7c3aed';
      case 'CONFIRM_PAYMENT':  return '#16a34a';
      case 'TOGGLE_USER_STATUS': return '#ca8a04';
      case 'TOGGLE_USER_WAITLIST': return '#d97706';
      case 'UPDATE_USER':      return '#2563eb';
      case 'ADD_REFERRAL':     return '#16a34a';
      case 'TOGGLE_REFERRAL':  return '#ca8a04';
      case 'UPDATE_REFERRAL_LABEL': return '#2563eb';
      case 'DELETE_REFERRAL':  return '#dc2626';
      case 'UPDATE_REGISTRATION_CAP': return '#7c3aed';
      default:                 return '#4b5563';
    }
  };

  const parseUserAgent = (ua: string) => {
    if (!ua || ua === 'unknown') return 'Unknown Device';
    let browser = 'Unknown Browser';
    if (ua.includes('Edg/'))        browser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    let os = 'Unknown OS';
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT')) os = 'Windows';
    else if (ua.includes('Mac OS X'))   os = 'macOS';
    else if (ua.includes('Linux'))      os = 'Linux';
    else if (ua.includes('Android'))    os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return `${browser} on ${os}`;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Audit Logs</h2>
        {total > 0 && (
          <span style={{ fontSize: '0.85rem', color: '#8C7B6B' }}>{total} total entries</span>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #E2D9CC', borderRadius: 6, fontSize: '0.9rem', background: '#fff' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8C7B6B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>To</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #E2D9CC', borderRadius: 6, fontSize: '0.9rem', background: '#fff' }}
          />
        </div>
        <button className="btn-primary" onClick={handleFilter} style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem' }}>
          Filter
        </button>
        {(fromDate || toDate) && (
          <button onClick={handleClear} style={{ padding: '0.5rem 1rem', fontSize: '0.88rem', background: 'transparent', border: '1px solid #E2D9CC', borderRadius: 6, cursor: 'pointer', color: '#8C7B6B' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2D9CC', padding: '1rem', marginBottom: '1.5rem' }}>
        <p style={{ color: '#8C7B6B', fontSize: '0.9rem', margin: 0 }}>
          This log automatically tracks all administrative actions. Showing {limit} per page, most recent first.
        </p>
      </div>

      {loading ? (
        <div className="admin-loading">Loading logs...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Device / IP</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#8C7B6B' }}>
                      No audit logs found for this period.
                    </td>
                  </tr>
                )}
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="admin-supporting-info" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="admin-row-name">{log.adminName}</div>
                      <div className="admin-supporting-info">{log.adminEmail}</div>
                    </td>
                    <td>
                      <span className="admin-badge" style={{
                        backgroundColor: `${getActionColor(log.action)}12`,
                        color: getActionColor(log.action),
                        border: `1px solid ${getActionColor(log.action)}25`,
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="admin-supporting-info" style={{ fontFamily: 'monospace' }}>{log.target || '-'}</td>
                    <td className="admin-supporting-info">
                      <div>{log.ipAddress}</div>
                      <div style={{ fontSize: '11px', color: '#8C7B6B' }} title={log.userAgent}>
                        {parseUserAgent(log.userAgent)}
                      </div>
                    </td>
                    <td className="admin-supporting-info" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details ? JSON.stringify(log.details) : ''}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #E2D9CC', backgroundColor: '#FAF7F2' }}>
              <div style={{ fontSize: '0.88rem', color: '#8C7B6B' }}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #E2D9CC', background: page === 1 ? '#F0EBE1' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#3B2F2F' }}>
                  Previous
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid #E2D9CC', background: page === totalPages ? '#F0EBE1' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#3B2F2F' }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
