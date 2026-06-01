import React, { useEffect, useState } from 'react';
import { getAdminFeedback } from '../../lib/api';
import { toast } from 'sonner';

export function AdminFeedback() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const adminToken = localStorage.getItem('adminToken') || '';

  const fetchFeedback = async (p = page) => {
    setLoading(true);
    try {
      const data = await getAdminFeedback(adminToken, {
        page: p,
        limit,
        session: sessionFilter
      });
      setFeedbackList(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError('Failed to load feedback: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(page);
  }, [page, sessionFilter]);

  const handleExportCSV = async () => {
    try {
      const response = await getAdminFeedback(adminToken, {
        session: sessionFilter,
        exportCsv: 'true'
      });
      const exportItems = response.data || [];
      if (exportItems.length === 0) {
        toast.info('No feedback to export.');
        return;
      }

      const headers = ['Name', 'Email', 'User Type', 'Organization', 'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Remarks (If any)'];
      const rows: string[][] = [];

      exportItems.forEach((item: any) => {
        const s1 = getSessionRating(item.feedback, 'Session 1');
        const s2 = getSessionRating(item.feedback, 'Session 2');
        const s3 = getSessionRating(item.feedback, 'Session 3');
        const s4 = getSessionRating(item.feedback, 'Session 4');
        
        const remarksText = item.feedback
          .filter((f: any) => f.text && f.text.trim())
          .map((f: any) => {
            const sMatch = f.session.match(/Session \d/);
            const sLabel = sMatch ? sMatch[0] : f.session;
            return `${sLabel}: ${f.text}`;
          })
          .join(' | ');

        rows.push([
          `"${item.fullName}"`,
          `"${item.email}"`,
          `"${item.userType}"`,
          `"${item.institution}"`,
          `"${s1}"`,
          `"${s2}"`,
          `"${s3}"`,
          `"${s4}"`,
          `"${remarksText.replace(/"/g, '""')}"`
        ]);
      });

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lead_with_ai_feedback.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to export feedback CSV.');
    }
  };

  const getSessionRating = (feedbackArray: any[], sessionKey: string) => {
    const f = feedbackArray.find(item => item.session.includes(sessionKey));
    return f ? f.rating || '-' : '-';
  };

  const getRemarksList = (feedbackArray: any[]) => {
    return feedbackArray
      .filter(item => item.text && item.text.trim())
      .map(item => {
        const sMatch = item.session.match(/Session \d/);
        const sLabel = sMatch ? sMatch[0] : item.session;
        return { label: sLabel, text: item.text };
      });
  };

  const getRatingBadge = (rating: string) => {
    if (!rating || rating === '-') return <span style={{ color: '#9ca3af' }}>-</span>;
    
    let bg = '#e5e7eb';
    let color = '#374151';
    let border = '1px solid #d1d5db';
    
    if (rating === 'Excellent') {
      bg = 'rgba(34,197,94,0.1)';
      color = '#16a34a';
      border = '1px solid rgba(34,197,94,0.2)';
    } else if (rating === 'Good') {
      bg = 'rgba(59,139,212,0.1)';
      color = '#3B8BD4';
      border = '1px solid rgba(59,139,212,0.2)';
    } else if (rating === 'Average') {
      bg = 'rgba(245,158,11,0.1)';
      color = '#b45309';
      border = '1px solid rgba(245,158,11,0.2)';
    } else if (rating === 'Poor') {
      bg = 'rgba(239,68,68,0.1)';
      color = '#dc2626';
      border = '1px solid rgba(239,68,68,0.2)';
    }
    
    return (
      <span className="admin-badge" style={{ background: bg, color: color, border: border, padding: '0.15rem 0.55rem', borderRadius: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {rating}
      </span>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">User Feedback</h2>
        <button className="btn-primary" onClick={handleExportCSV}>
          Export CSV
        </button>
      </div>

      <div className="admin-controls" style={{ marginBottom: '1.5rem' }}>
        <select
          value={sessionFilter}
          onChange={e => { setSessionFilter(e.target.value); setPage(1); }}
          className="admin-select"
          style={{ maxWidth: '300px' }}
        >
          <option value="">All Sessions</option>
          <option value="Session 1">Session 1</option>
          <option value="Session 2">Session 2</option>
          <option value="Session 3">Session 3</option>
          <option value="Session 4">Session 4</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#8C7B6B', fontWeight: 600 }}>
          {total} total users submitted feedback
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading feedback...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Organization</th>
                <th>Session 1</th>
                <th>Session 2</th>
                <th>Session 3</th>
                <th>Session 4</th>
                <th>Remarks (If any)</th>
              </tr>
            </thead>
            <tbody>
              {feedbackList.map((user: any) => (
                <tr key={user.id}>
                  <td style={{ verticalAlign: 'top', width: '220px' }}>
                    <div className="admin-row-name">{user.fullName}</div>
                    <div className="admin-supporting-info" style={{ marginTop: '0.1rem' }}>{user.email}</div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <span className="admin-badge" style={{
                        background: user.userType === 'student' ? 'rgba(59,139,212,0.08)' : 'rgba(71,85,105,0.08)',
                        color: user.userType === 'student' ? '#3B8BD4' : '#475569',
                        border: `1px solid ${user.userType === 'student' ? 'rgba(59,139,212,0.2)' : 'rgba(71,85,105,0.2)'}`,
                      }}>
                        {user.userType === 'student' ? 'Student' : 'Professional'}
                      </span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', width: '180px' }} className="admin-supporting-info">
                    {user.institution}
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    {getRatingBadge(getSessionRating(user.feedback, 'Session 1'))}
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    {getRatingBadge(getSessionRating(user.feedback, 'Session 2'))}
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    {getRatingBadge(getSessionRating(user.feedback, 'Session 3'))}
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
                    {getRatingBadge(getSessionRating(user.feedback, 'Session 4'))}
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {getRemarksList(user.feedback).map((rem, idx) => (
                        <div key={idx} style={{ padding: '0.4rem 0.6rem', background: '#FAF7F2', borderRadius: '4px', border: '1px solid #F0EBE1' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3B8BD4', display: 'block', textTransform: 'uppercase', marginBottom: '0.1rem' }}>
                            {rem.label}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: '#3B2F2F', lineHeight: '1.3' }}>
                            {rem.text}
                          </span>
                        </div>
                      ))}
                      {getRemarksList(user.feedback).length === 0 && (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {feedbackList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#8C7B6B' }}>
                    No feedback found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

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
        </div>
      )}
    </div>
  );
}
