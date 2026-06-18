import React, { useEffect, useState } from 'react';
import { getAdminStats, getAdminSettings } from '../../lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

export function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  const token = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [data, settingsData] = await Promise.all([
          getAdminStats(token, selectedCohort, selectedSource),
          getAdminSettings(token)
        ]);
        setStats(data);
        setCohorts((settingsData as any).cohorts || []);
        setReferrals(settingsData.referralCodes || []);
      } catch (err: any) {
        setError('Failed to load stats. ' + (err.message || ''));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token, selectedCohort, selectedSource]);

  const downloadCsv = (title: string, headers: string[], rows: any[][]) => {
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lead_with_ai_${title.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReferralReport = () => {
    if (!stats || !stats.referralBreakdown) return;
    const referralEntries = Object.entries(stats.referralBreakdown).sort((a: any, b: any) => b[1].total - a[1].total);
    if (referralEntries.length === 0) {
      alert('No referral statistics to download.');
      return;
    }
    const headers = ['Referral Code / Label', 'Total Registrations', 'Students', 'Professionals/Others', 'Revenue Made'];
    const rows = referralEntries.map(([code, data]: any) => [
      code,
      data.total,
      data.students,
      data.professionals,
      data.revenue || 0
    ]);
    downloadCsv('referral_breakdown', headers, rows);
  };

  const handleDownloadCategoryReport = () => {
    if (!stats) return;
    const headers = ['Category', 'Registrations', 'Revenue'];
    const rows = [
      ['Students', stats.studentCount || 0, (stats.paidStudentCount || 0) * 499],
      ['Working Professionals', stats.professionalCount || 0, (stats.paidProfessionalCount || 0) * 999]
    ];
    downloadCsv('category', headers, rows);
  };

  const handleDownloadCountryReport = () => {
    if (!stats || !stats.countryReport) return;
    const headers = ['Country', 'Registrations', 'Revenue'];
    const rows = Object.entries(stats.countryReport).map(([country, data]: any) => [
      country,
      typeof data === 'object' ? (data.registrations || 0) : data,
      typeof data === 'object' ? (data.revenue || 0) : 0
    ]);
    downloadCsv('country', headers, rows);
  };

  const handleDownloadCollegeReport = () => {
    if (!stats || !stats.collegeReport) return;
    const headers = ['College Name', 'Registrations', 'Revenue'];
    const rows = Object.entries(stats.collegeReport)
      .sort((a: any, b: any) => a[0].localeCompare(b[0]))
      .map(([college, data]: any) => [
        college,
        data.registrations || 0,
        data.revenue || 0
      ]);
    downloadCsv('college', headers, rows);
  };

  const handleDownloadOrganizationReport = () => {
    if (!stats || !stats.organizationReport) return;
    const headers = ['Organization', 'Registrations', 'Revenue'];
    const rows = Object.entries(stats.organizationReport)
      .sort((a: any, b: any) => a[0].localeCompare(b[0]))
      .map(([org, data]: any) => [
        org,
        data.registrations || 0,
        data.revenue || 0
      ]);
    downloadCsv('organization', headers, rows);
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
  const USER_COLORS = ['#3B8BD4', '#1E293B'];

  // Chart 2: Payment Status
  const paid = stats.paidUsers || 0;
  const unpaid = stats.unpaidUsers || 0;
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const unpaidPct = total > 0 ? Math.round((unpaid / total) * 100) : 0;

  const paymentData = [
    { name: 'Paid', value: paid },
    { name: 'Unpaid', value: unpaid }
  ];
  const PAYMENT_COLORS = ['#3B8BD4', '#94A3B8'];

  // Chart 3: Heard From Source
  const heardFromSocialMedia = stats.heardFromSocialMedia || 0;
  const heardFromNewspaper   = stats.heardFromNewspaper   || 0;
  const heardFromGktEmployee = stats.heardFromGktEmployee || 0;
  const heardFromOthers      = stats.heardFromOthers      || 0;
  const heardFromTotal = heardFromSocialMedia + heardFromNewspaper + heardFromGktEmployee + heardFromOthers;

  const heardFromData = [
    { name: 'Social Media',  value: heardFromSocialMedia },
    { name: 'Newspaper',     value: heardFromNewspaper },
    { name: 'GKT Employee',  value: heardFromGktEmployee },
    { name: 'Others',        value: heardFromOthers },
  ];
  const HEARD_COLORS = ['#3B8BD4', '#1E293B', '#C84B31', '#64748B'];
  const pct = (n: number) => heardFromTotal > 0 ? Math.round((n / heardFromTotal) * 100) : 0;

  // Category revenue (used in the category split table)
  const studRev = (stats.paidStudentCount || 0) * 499;
  const profRev = (stats.paidProfessionalCount || 0) * 999;
  const totalCatRevenue = studRev + profRev;

  // Table calculations
  const referralTotalReg = referralEntries.reduce((sum, [, d]: any) => sum + (d.total || 0), 0);
  const referralTotalStud = referralEntries.reduce((sum, [, d]: any) => sum + (d.students || 0), 0);
  const referralTotalProf = referralEntries.reduce((sum, [, d]: any) => sum + (d.professionals || 0), 0);
  const referralTotalRev = referralEntries.reduce((sum, [, d]: any) => sum + (d.revenue || 0), 0);

  const countryEntries = Object.entries(stats.countryReport || {});
  const countryTotalReg = countryEntries.reduce((sum, [, d]: any) => sum + (typeof d === 'object' ? (d.registrations || 0) : d), 0);
  const countryTotalRev = countryEntries.reduce((sum, [, d]: any) => sum + (typeof d === 'object' ? (d.revenue || 0) : 0), 0);

  const collegeEntries = Object.entries(stats.collegeReport || {}).sort((a: any, b: any) => a[0].localeCompare(b[0]));
  const collegeTotalReg = collegeEntries.reduce((sum, [, d]: any) => sum + (d.registrations || 0), 0);
  const collegeTotalRev = collegeEntries.reduce((sum, [, d]: any) => sum + (d.revenue || 0), 0);

  const organizationEntries = Object.entries(stats.organizationReport || {}).sort((a: any, b: any) => a[0].localeCompare(b[0]));
  const organizationTotalReg = organizationEntries.reduce((sum, [, d]: any) => sum + (d.registrations || 0), 0);
  const organizationTotalRev = organizationEntries.reduce((sum, [, d]: any) => sum + (d.revenue || 0), 0);

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="admin-page-title" style={{ margin: 0 }}>Dashboard Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Filter by Cohort:</span>
            <select
              value={selectedCohort}
              onChange={e => setSelectedCohort(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff', fontSize: '0.85rem', color: '#1E293B' }}
            >
              <option value="all">All Cohorts</option>
              {cohorts.map(c => {
                const completed = isCohortCompleted(c);
                return (
                  <option key={c} value={c}>{c} {completed ? '(Completed)' : ''}</option>
                );
              })}
              <option value="-">No Cohort (-)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Filter by Source:</span>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              style={{ padding: '0.4rem 0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#fff', fontSize: '0.85rem', color: '#1E293B' }}
            >
              <option value="all">All Sources</option>
              <option value="social media">Social Media</option>
              <option value="newspaper">Newspaper</option>
              {referrals.map(r => (
                <option key={r.code} value={r.label}>{r.label}</option>
              ))}
              <option value="others">Others</option>
            </select>
          </div>

          {/* Download Report button */}
          <button
            onClick={() => {
              const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
              const cohortParam = encodeURIComponent(selectedCohort);
              window.open(`${base}/admin/report?cohort=${cohortParam}`, '_blank');
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 1rem',
              background: '#1E293B', color: '#fff',
              border: 'none', borderRadius: '6px',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1E293B')}
            title="Open printable workshop report in new tab"
          >
            📄 Workshop Report
          </button>

        </div>
      </div>

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
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#0F172A', fontSize: '1.05rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Types of Participants
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: '1.2', height: 160 }}>
              {total === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.85rem' }}>No data</div>
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
            <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid #E2E8F0', paddingLeft: '0.75rem', fontSize: '0.82rem', color: '#334155' }}>
              <div>
                <strong style={{ color: '#64748B' }}>Total:</strong> {total}
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
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#0F172A', fontSize: '1.05rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Payment Status
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: '1.2', height: 160 }}>
              {total === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.85rem' }}>No data</div>
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
            <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid #E2E8F0', paddingLeft: '0.75rem', fontSize: '0.82rem', color: '#334155' }}>
              <div>
                <strong style={{ color: '#64748B' }}>Total:</strong> {total}
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
        <div className="admin-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ marginBottom: '1.2rem', color: '#0F172A', fontSize: '1.05rem', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Heard From Source
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: '1.2', height: 160 }}>
              {heardFromTotal === 0 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.85rem' }}>No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={heardFromData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {heardFromData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={HEARD_COLORS[index % HEARD_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} paxs`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid #E2E8F0', paddingLeft: '0.75rem', fontSize: '0.82rem', color: '#334155' }}>
              <div><strong style={{ color: '#64748B' }}>Total:</strong> {heardFromTotal}</div>
              {heardFromData.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: HEARD_COLORS[i], display: 'inline-block', flexShrink: 0 }} />
                  <span><strong>{item.name}:</strong> {item.value} ({pct(item.value)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Source/Category Breakdown & Country Report (Row 1) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Source / Category Table */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedSource === 'all' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0 }}>Source Breakdown</h3>
                <button className="btn-primary" onClick={handleDownloadReferralReport} style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
                  Download CSV
                </button>
              </div>
              <div className="admin-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th style={{ textAlign: 'center' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Students</th>
                      <th style={{ textAlign: 'center' }}>Professionals</th>
                      <th style={{ textAlign: 'center' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralEntries.length > 0 ? (
                      referralEntries.map(([code, data]: any) => (
                        <tr key={code}>
                          <td style={{ fontWeight: 500 }}>{code}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{data.total}</td>
                          <td style={{ textAlign: 'center' }}>{data.students}</td>
                          <td style={{ textAlign: 'center' }}>{data.professionals}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>₹{(data.revenue || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#8C7B6B' }}>
                          No referral statistics to show.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {referralEntries.length > 0 && (
                    <tfoot>
                      <tr style={{ fontWeight: 'bold', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <td>Total</td>
                        <td style={{ textAlign: 'center' }}>{referralTotalReg}</td>
                        <td style={{ textAlign: 'center' }}>{referralTotalStud}</td>
                        <td style={{ textAlign: 'center' }}>{referralTotalProf}</td>
                        <td style={{ textAlign: 'center' }}>₹{referralTotalRev.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0 }}>Category Split-up</h3>
                <button className="btn-primary" onClick={handleDownloadCategoryReport} style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
                  Download CSV
                </button>
              </div>
              <div className="admin-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'center' }}>Registrations</th>
                      <th style={{ textAlign: 'center' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Students</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{stats.studentCount || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>₹{studRev.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500 }}>Working Professionals</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{stats.professionalCount || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>₹{profRev.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 'bold', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td>Total</td>
                      <td style={{ textAlign: 'center' }}>{students + professionals}</td>
                      <td style={{ textAlign: 'center' }}>₹{totalCatRevenue.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Country Report Card */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Country Report</h3>
            <button className="btn-primary" onClick={handleDownloadCountryReport} style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
              Download CSV
            </button>
          </div>
          <div className="admin-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th style={{ textAlign: 'center' }}>Registrations</th>
                  <th style={{ textAlign: 'center' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {countryEntries.length > 0 ? (
                  countryEntries.map(([country, data]: any) => (
                    <tr key={country}>
                      <td className="admin-row-name">{country}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {typeof data === 'object' ? (data.registrations || 0) : data}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        ₹{typeof data === 'object' ? (data.revenue || 0).toLocaleString('en-IN') : 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#8C7B6B' }}>
                      No country registration data.
                    </td>
                  </tr>
                )}
              </tbody>
              {countryEntries.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'center' }}>{countryTotalReg}</td>
                    <td style={{ textAlign: 'center' }}>₹{countryTotalRev.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

      {/* ── College Report & Organization Report (Row 2) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* College Report Card */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>College Report</h3>
            <button className="btn-primary" onClick={handleDownloadCollegeReport} style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
              Download CSV
            </button>
          </div>
          <div className="admin-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>College Name</th>
                  <th style={{ textAlign: 'center' }}>Registrations</th>
                  <th style={{ textAlign: 'center' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {collegeEntries.length > 0 ? (
                  collegeEntries.map(([college, data]: any) => (
                    <tr key={college}>
                      <td className="admin-row-name">{college}</td>
                      <td style={{ textAlign: 'center' }}>{data.registrations || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>₹{(data.revenue || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#8C7B6B' }}>
                      No college registration data.
                    </td>
                  </tr>
                )}
              </tbody>
              {collegeEntries.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'center' }}>{collegeTotalReg}</td>
                    <td style={{ textAlign: 'center' }}>₹{collegeTotalRev.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Organization Report Card */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Organization Report</h3>
            <button className="btn-primary" onClick={handleDownloadOrganizationReport} style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
              Download CSV
            </button>
          </div>
          <div className="admin-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th style={{ textAlign: 'center' }}>Registrations</th>
                  <th style={{ textAlign: 'center' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {organizationEntries.length > 0 ? (
                  organizationEntries.map(([org, data]: any) => (
                    <tr key={org}>
                      <td className="admin-row-name">{org}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{data.registrations || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>₹{(data.revenue || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: '#8C7B6B' }}>
                      No organization data.
                    </td>
                  </tr>
                )}
              </tbody>
              {organizationEntries.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'center' }}>{organizationTotalReg}</td>
                    <td style={{ textAlign: 'center' }}>₹{organizationTotalRev.toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

