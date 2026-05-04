import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../../lib/api';

export function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken') || '';
        const data = await getAdminStats(token);
        setStats(data);
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

  return (
    <div className="admin-page">
      <h2 className="admin-page-title">Dashboard Overview</h2>
      
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
