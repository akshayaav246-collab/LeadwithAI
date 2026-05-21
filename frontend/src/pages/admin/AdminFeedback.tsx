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

      const headers = ['Name', 'Email', 'User Type', 'Institution', 'Session', 'Feedback Text', 'Submitted At'];
      const rows: string[][] = [];

      exportItems.forEach((item: any) => {
        item.feedback.forEach((f: any) => {
          rows.push([
            `"${item.fullName}"`,
            `"${item.email}"`,
            `"${item.userType}"`,
            `"${item.institution}"`,
            `"${f.session}"`,
            `"${f.text.replace(/"/g, '""')}"`,
            `"${new Date(item.createdAt).toLocaleString()}"`
          ]);
        });
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
                <th>User Details</th>
                <th>Institution</th>
                <th>Feedback Submissions</th>
              </tr>
            </thead>
            <tbody>
              {feedbackList.map((user: any) => (
                <tr key={user.id}>
                  <td style={{ verticalAlign: 'top', width: '250px' }}>
                    <div className="admin-row-name">{user.fullName}</div>
                    <div className="admin-supporting-info" style={{ marginTop: '0.1rem' }}>{user.email}</div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <span className="admin-badge" style={{
                        background: user.userType === 'student' ? 'rgba(196,149,106,0.1)' : 'rgba(90,74,58,0.1)',
                        color: user.userType === 'student' ? '#C4956A' : '#5a4a3a',
                        border: `1px solid ${user.userType === 'student' ? 'rgba(196,149,106,0.2)' : 'rgba(90,74,58,0.2)'}`,
                      }}>
                        {user.userType === 'student' ? 'Student' : 'Professional'}
                      </span>
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', width: '200px' }} className="admin-supporting-info">
                    {user.institution}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {user.feedback.map((f: any, idx: number) => (
                        <div key={idx} style={{ padding: '0.5rem 0.75rem', background: '#FAF7F2', borderRadius: '6px', border: '1px solid #F0EBE1' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#C4956A', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                            {f.session}
                          </span>
                          <span style={{ fontSize: '0.88rem', color: '#3B2F2F', lineHeight: '1.4' }}>
                            {f.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {feedbackList.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#8C7B6B' }}>
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
