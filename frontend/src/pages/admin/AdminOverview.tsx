import React, { useEffect, useState } from 'react';
import { getAdminStats, getAdminSettings, updateAdminSettings } from '../../lib/api';

export function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [updatingSetting, setUpdatingSetting] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const data = await getAdminStats(token);
        const settings = await getAdminSettings(token);
        setStats(data);
        setFeedbackEnabled(settings.feedbackEnabled);
      } catch (err: any) {
        setError('Failed to load stats. ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="admin-loading">Loading overview...</div>;
  if (error) return <div className="admin-error">{error}</div>;
  if (!stats) return null;

  const toggleFeedback = async () => {
    setUpdatingSetting(true);
    try {
      const token = localStorage.getItem('adminToken') || '';
      const res = await updateAdminSettings(token, !feedbackEnabled);
      setFeedbackEnabled(res.feedbackEnabled);
    } catch (err: any) {
      alert('Failed to update setting: ' + err.message);
    } finally {
      setUpdatingSetting(false);
    }
  };

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="admin-page-title">Dashboard Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 500, color: '#152446' }}>Post-Session Feedback:</span>
          <button 
            className="btn-primary" 
            onClick={toggleFeedback}
            disabled={updatingSetting}
            style={{ 
              padding: '6px 12px', 
              fontSize: '14px', 
              backgroundColor: feedbackEnabled ? '#2e7d32' : '#C4956A',
              borderColor: feedbackEnabled ? '#2e7d32' : '#C4956A',
            }}
          >
            {updatingSetting ? 'Updating...' : (feedbackEnabled ? 'Enabled (Turn Off)' : 'Disabled (Turn On)')}
          </button>
        </div>
      </div>
      
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="admin-stat-card highlight">
          <div className="stat-label">Paid Users</div>
          <div className="stat-value">{stats.paidUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Conversion Rate</div>
          <div className="stat-value">
            {stats.totalUsers > 0 
              ? Math.round((stats.paidUsers / stats.totalUsers) * 100) 
              : 0}%
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h3>Recent Registrations</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRegistrations.map((user: any) => (
                <tr key={user._id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td style={{ textTransform: 'capitalize' }}>{user.userType}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {stats.recentRegistrations.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>No registrations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
