import React, { useEffect, useState } from 'react';
import { getAdminStats } from '../../lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const data = await getAdminStats(token);
        setStats(data);
      } catch (err: any) {
        setError('Failed to load stats. ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const handleDownloadReferralReport = () => {
    if (!stats || !stats.referralBreakdown) return;
    const referralEntries = Object.entries(stats.referralBreakdown).sort((a: any, b: any) => b[1].total - a[1].total);
    if (referralEntries.length === 0) {
      alert('No referral statistics to download.');
      return;
    }
    const headers = ['Referral Code / Label', 'Total Registrations', 'Students', 'Professionals/Others'];
    const rows = referralEntries.map(([code, data]: any) => [`"${code}"`, data.total, data.students, data.professionals]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'lead_with_ai_referral_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="admin-loading">Loading overview...</div>;
  if (error)   return <div className="admin-error">{error}</div>;
  if (!stats)  return null;

  const referralEntries = Object.entries(stats.referralBreakdown || {}).sort((a: any, b: any) => b[1].total - a[1].total);

  const total = stats.totalUsers || 0;
  
  // Chart 1: User Types
  const students = stats.studentCount || 0;
  const professionals = stats.professionalCount || 0;
  const studentPct = total > 0 ? Math.round((students / total) * 100) : 0;
  const professionalPct = total > 0 ? Math.round((professionals / total) * 100) : 0;
  
  const userTypeData = [
    { name: 'Students', value: students },
    { name: 'Professionals', value: professionals }
  ];
  const USER_COLORS = ['#C4956A', '#3B2F2F']; // Brand Gold, Dark Brown

  // Chart 2: Payment Status
  const paid = stats.paidUsers || 0;
  const unpaid = stats.unpaidUsers || 0;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const unpaidPct = total > 0 ? Math.round((unpaid / total) * 100) : 0;

  const paymentData = [
    { name: 'Paid', value: paid },
    { name: 'Unpaid', value: unpaid }
  ];
  const PAYMENT_COLORS = ['#C4956A', '#8C7B6B']; // Brand Gold, Muted Brown

  // Chart 3: Heard From Source
  const socialMedia = stats.heardFromSocialMedia || 0;
  const newspaper = stats.heardFromNewspaper || 0;
  const others = stats.heardFromOthers || 0;
  const totalHeard = socialMedia + newspaper + others;

  const socialMediaPct = totalHeard > 0 ? Math.round((socialMedia / totalHeard) * 100) : 0;
  const newspaperPct = totalHeard > 0 ? Math.round((newspaper / totalHeard) * 100) : 0;
  const othersPct = totalHeard > 0 ? Math.round((others / totalHeard) * 100) : 0;

  const sourceData = [
    { name: 'Social Media', value: socialMedia },
    { name: 'Newspaper', value: newspaper },
    { name: 'Others', value: others }
  ];
  const SOURCE_COLORS = ['#C4956A', '#3B2F2F', '#8C7B6B']; // Brand Gold, Dark Brown, Muted Brown

  return (
    <div className="admin-page">
      <h2 className="admin-page-title">Dashboard Overview</h2>

      {/* ── Stats Grid ── */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '2rem' }}>
        <div className="admin-stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.totalUsers}</div>
        </div>
        <div className="admin-stat-card highlight">
          <div className="stat-label">Paid Users</div>
          <div className="stat-value">{stats.paidUsers}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Unpaid Users</div>
          <div className="stat-value">{stats.unpaidUsers ?? (stats.totalUsers - stats.paidUsers)}</div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-label">Conversion Rate</div>
          <div className="stat-value">
            {stats.totalUsers > 0 ? Math.round((stats.paidUsers / stats.totalUsers) * 100) : 0}%
          </div>
        </div>
        <div className="admin-stat-card highlight">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value" style={{ fontSize: '2.5rem' }}>
            ₹{(stats.totalRevenue ?? 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* ── Pie Charts Side by Side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* User Type Pie Chart */}
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #E2D9CC' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#2A1F14', fontSize: '1.05rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Types of Participants
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: '1.2', height: 160 }}>
              {total === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8C7B6B', fontSize: '0.85rem' }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {userTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={USER_COLORS[index % USER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} paxs`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid #FAF7F2', paddingLeft: '0.75rem', fontSize: '0.82rem', color: '#2A1F14' }}>
              <div>
                <strong style={{ color: '#8C7B6B' }}>Total:</strong> {total}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: USER_COLORS[0], display: 'inline-block' }} />
                <span><strong>Students:</strong> {students} ({studentPct}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: USER_COLORS[1], display: 'inline-block' }} />
                <span><strong>Professionals:</strong> {professionals} ({professionalPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Pie Chart */}
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #E2D9CC' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#2A1F14', fontSize: '1.05rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Payment Status
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: '1.2', height: 160 }}>
              {total === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8C7B6B', fontSize: '0.85rem' }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} paxs`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid #FAF7F2', paddingLeft: '0.75rem', fontSize: '0.82rem', color: '#2A1F14' }}>
              <div>
                <strong style={{ color: '#8C7B6B' }}>Total:</strong> {total}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PAYMENT_COLORS[0], display: 'inline-block' }} />
                <span><strong>Paid:</strong> {paid} ({paidPct}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: PAYMENT_COLORS[1], display: 'inline-block' }} />
                <span><strong>Unpaid:</strong> {unpaid} ({unpaidPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Heard From Source Pie Chart */}
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #E2D9CC' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#2A1F14', fontSize: '1.05rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Heard From Source
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: '1.2', height: 160 }}>
              {totalHeard === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8C7B6B', fontSize: '0.85rem' }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} paxs`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid #FAF7F2', paddingLeft: '0.75rem', fontSize: '0.82rem', color: '#2A1F14' }}>
              <div>
                <strong style={{ color: '#8C7B6B' }}>Total Responded:</strong> {totalHeard}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SOURCE_COLORS[0], display: 'inline-block' }} />
                <span><strong>Social Media:</strong> {socialMedia} ({socialMediaPct}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SOURCE_COLORS[1], display: 'inline-block' }} />
                <span><strong>Newspaper:</strong> {newspaper} ({newspaperPct}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SOURCE_COLORS[2], display: 'inline-block' }} />
                <span><strong>Others:</strong> {others} ({othersPct}%)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Referral Breakdown ── */}
      {referralEntries.length > 0 && (
        <div className="admin-section" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Referral Breakdown</h3>
            <button className="btn-primary" onClick={handleDownloadReferralReport} style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
              Download Report
            </button>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Referral Code</th>
                  <th style={{ textAlign: 'center' }}>Total Registrations</th>
                  <th style={{ textAlign: 'center' }}>Students</th>
                  <th style={{ textAlign: 'center' }}>Professionals/Others</th>
                </tr>
              </thead>
              <tbody>
                {referralEntries.map(([code, data]: any) => (
                  <tr key={code}>
                    <td style={{ fontWeight: 500 }}>{code}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{data.total}</td>
                    <td style={{ textAlign: 'center' }}>{data.students}</td>
                    <td style={{ textAlign: 'center' }}>{data.professionals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
