import React, { useEffect, useState } from 'react';
import { getAdminStats, getAdminSettings } from '../../lib/api';
import { publicAsset } from '../../lib/assets';

function fmt(n: number) {
  return `₹${(n || 0).toLocaleString('en-IN')}`;
}

// Helper: get readable label from referral code key
function refLabel(key: string) {
  if (!key || key === 'none') return 'No Referral';
  // key looks like "gkt01 - Chetana N" → show "Chetana N"
  const parts = key.split(' - ');
  return parts.length > 1 ? parts[1] : key;
}

export function AdminReport() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState('all');
  const [cohortLabel, setCohortLabel] = useState('All Cohorts');
  const token = localStorage.getItem('adminToken') || '';

  useEffect(() => {
    // Read cohort from URL query param
    const params = new URLSearchParams(window.location.search);
    const c = params.get('cohort') || 'all';
    setCohort(c);
    setCohortLabel(c === 'all' ? 'All Cohorts' : c);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAdminStats(token, cohort, 'all')
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cohort, token]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      Loading report...
    </div>
  );

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#dc2626' }}>
      Failed to load report data.
    </div>
  );

  const paid = stats.paidUsers || 0;
  const paidStudents = stats.paidStudentCount || 0;
  const paidProfs = stats.paidProfessionalCount || 0;
  const totalRev = stats.totalRevenue || 0;
  const studRev = paidStudents * 499;
  const profRev = paidProfs * 999;

  const referralEntries: [string, any][] = Object.entries(stats.referralBreakdown || {})
    .sort((a: any, b: any) => b[1].revenue - a[1].revenue);

  const noRef = stats.noReferralBreakdown || {};
  const noRefSources = Object.entries(noRef) as [string, any][];

  const collegeEntries: [string, any][] = Object.entries(stats.collegeReport || {})
    .sort((a, b) => a[0].localeCompare(b[0]));

  const orgEntries: [string, any][] = Object.entries(stats.organizationReport || {})
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Group colleges by referral and by source
  function groupBy(entries: [string, any][], key: 'byReferral' | 'bySource') {
    const groups: Record<string, { name: string; count: number; revenue: number }[]> = {};
    for (const [name, data] of entries) {
      const map: Record<string, any> = data[key] || {};
      for (const [groupKey, val] of Object.entries(map)) {
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push({ name, count: (val as any).count || val, revenue: (val as any).revenue || 0 });
      }
    }
    return groups;
  }

  const collegeByReferral = groupBy(collegeEntries, 'byReferral');
  const collegeBySource = groupBy(collegeEntries, 'bySource');
  const orgByReferral = groupBy(orgEntries, 'byReferral');
  const orgBySource = groupBy(orgEntries, 'bySource');

  const sourceOrder = ['Social Media', 'Newspaper', 'Friends', 'Others'];

  const styles: Record<string, React.CSSProperties> = {
    page: {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '11pt',
      color: '#1E293B',
      background: '#fff',
      padding: '20mm 18mm',
      maxWidth: '900px',
      margin: '0 auto',
    },
    pageHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '3px solid #1E293B',
      paddingBottom: '12px',
      marginBottom: '20px',
    },
    logo: { height: 48, objectFit: 'contain' as const },
    titleBlock: { textAlign: 'center' as const, flex: 1 },
    title: { fontSize: '16pt', fontWeight: 700, color: '#1E293B', margin: 0 },
    subtitle: { fontSize: '11pt', color: '#475569', margin: '2px 0 0 0' },
    sectionTitle: {
      fontSize: '12pt',
      fontWeight: 700,
      color: '#fff',
      background: '#1E293B',
      padding: '6px 14px',
      marginBottom: '8px',
      marginTop: '24px',
      borderRadius: '4px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    subTitle: {
      fontSize: '10pt',
      fontWeight: 700,
      color: '#3B8BD4',
      borderBottom: '1.5px solid #3B8BD4',
      paddingBottom: '3px',
      marginBottom: '6px',
      marginTop: '16px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '9.5pt',
      marginBottom: '8px',
    },
    th: {
      background: '#F1F5F9',
      padding: '6px 10px',
      textAlign: 'left' as const,
      fontWeight: 700,
      border: '1px solid #CBD5E1',
      color: '#334155',
    },
    td: {
      padding: '5px 10px',
      border: '1px solid #E2E8F0',
      verticalAlign: 'top' as const,
    },
    tdCenter: {
      padding: '5px 10px',
      border: '1px solid #E2E8F0',
      textAlign: 'center' as const,
    },
    tdRight: {
      padding: '5px 10px',
      border: '1px solid #E2E8F0',
      textAlign: 'right' as const,
    },
    totalsRow: {
      background: '#F8FAFC',
      fontWeight: 700,
      borderTop: '2px solid #CBD5E1',
    },
    statGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      marginBottom: '20px',
    },
    statCard: {
      border: '1.5px solid #E2E8F0',
      borderRadius: '6px',
      padding: '12px',
      textAlign: 'center' as const,
    },
    statLabel: { fontSize: '8.5pt', color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    statValue: { fontSize: '16pt', fontWeight: 700, color: '#1E293B', marginTop: '4px' },
    printBtn: {
      position: 'fixed' as const,
      top: 16, right: 16,
      background: '#1E293B',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '13px',
      fontWeight: 700,
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 9999,
    },
  };

  return (
    <>

      <button className="no-print" style={styles.printBtn} onClick={() => window.print()}>
        🖨️ Print / Save as PDF
      </button>

      <div style={styles.page} className="print-page">
        {/* Page Header — repeats on print */}
        <div style={styles.pageHeader} className="report-page-header">
          <img src={publicAsset('Logo.png')} alt="GKT Logo" style={styles.logo} />
          <div style={styles.titleBlock}>
            <p style={styles.title}>Lead with AI — Workshop Report</p>
            <p style={styles.subtitle}>{cohortLabel}</p>
          </div>
          <div style={{ width: 80 }} /> {/* spacer to balance logo */}
        </div>

        {/* ── Summary Cards ── */}
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Paid</div>
            <div style={styles.statValue}>{paid}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Students</div>
            <div style={{ ...styles.statValue, color: '#3B8BD4' }}>{paidStudents}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Professionals</div>
            <div style={{ ...styles.statValue, color: '#0369A1' }}>{paidProfs}</div>
          </div>
          <div style={{ ...styles.statCard, background: '#F0FDF4' }}>
            <div style={styles.statLabel}>Total Revenue</div>
            <div style={{ ...styles.statValue, color: '#16a34a', fontSize: '13pt' }}>{fmt(totalRev)}</div>
          </div>
        </div>

        {/* ── Revenue Split ── */}
        <div style={styles.sectionTitle}>Revenue Split</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Category</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Count</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>Students (₹499 each)</td>
              <td style={styles.tdCenter}>{paidStudents}</td>
              <td style={styles.tdRight}>{fmt(studRev)}</td>
              <td style={styles.tdRight}>{totalRev > 0 ? Math.round((studRev / totalRev) * 100) : 0}%</td>
            </tr>
            <tr>
              <td style={styles.td}>Professionals (₹999 each)</td>
              <td style={styles.tdCenter}>{paidProfs}</td>
              <td style={styles.tdRight}>{fmt(profRev)}</td>
              <td style={styles.tdRight}>{totalRev > 0 ? Math.round((profRev / totalRev) * 100) : 0}%</td>
            </tr>
            <tr style={styles.totalsRow}>
              <td style={styles.td}><strong>Total</strong></td>
              <td style={styles.tdCenter}><strong>{paid}</strong></td>
              <td style={styles.tdRight}><strong>{fmt(totalRev)}</strong></td>
              <td style={styles.tdRight}><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>

        {/* ── Referral Breakdown ── */}
        <div style={styles.sectionTitle}>Referral Breakdown</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Referral</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Students</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Professionals</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Total</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {referralEntries.length === 0 && (
              <tr><td colSpan={5} style={{ ...styles.td, color: '#94A3B8', textAlign: 'center' }}>No referral data</td></tr>
            )}
            {referralEntries.map(([key, d]) => (
              <tr key={key}>
                <td style={styles.td}><strong>{refLabel(key)}</strong> <span style={{ color: '#94A3B8', fontSize: '9pt' }}>({key.split(' - ')[0]})</span></td>
                <td style={styles.tdCenter}>{d.students || 0}</td>
                <td style={styles.tdCenter}>{d.professionals || 0}</td>
                <td style={styles.tdCenter}>{d.total || 0}</td>
                <td style={styles.tdRight}>{fmt(d.revenue || 0)}</td>
              </tr>
            ))}
            {/* No Referral rows by source */}
            {noRefSources.map(([src, d]) => (
              <tr key={`no-ref-${src}`}>
                <td style={{ ...styles.td, color: '#64748B', fontStyle: 'italic' }}>{src}</td>
                <td style={styles.tdCenter}>{d.students || 0}</td>
                <td style={styles.tdCenter}>{d.professionals || 0}</td>
                <td style={styles.tdCenter}>{(d.students || 0) + (d.professionals || 0)}</td>
                <td style={styles.tdRight}>{fmt(d.revenue || 0)}</td>
              </tr>
            ))}
            {/* Totals */}
            {(referralEntries.length > 0 || noRefSources.length > 0) && (() => {
              const allRev = referralEntries.reduce((s, [, d]) => s + (d.revenue || 0), 0) +
                noRefSources.reduce((s, [, d]) => s + (d.revenue || 0), 0);
              const allTotal = referralEntries.reduce((s, [, d]) => s + (d.total || 0), 0) +
                noRefSources.reduce((s, [, d]) => s + (d.students || 0) + (d.professionals || 0), 0);
              return (
                <tr style={styles.totalsRow}>
                  <td style={styles.td}><strong>Total</strong></td>
                  <td style={styles.tdCenter}><strong>{paidStudents}</strong></td>
                  <td style={styles.tdCenter}><strong>{paidProfs}</strong></td>
                  <td style={styles.tdCenter}><strong>{allTotal}</strong></td>
                  <td style={styles.tdRight}><strong>{fmt(allRev)}</strong></td>
                </tr>
              );
            })()}
          </tbody>
        </table>

        {/* ── College Report ── */}
        <div style={styles.sectionTitle}>College Report</div>

        {/* By each referral person */}
        {Object.entries(collegeByReferral).map(([refKey, colleges]) => (
          <div key={refKey} className="page-break-avoid">
            <div style={styles.subTitle}>🔗 {refLabel(refKey)}</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>College Name</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Count</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {colleges.sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <tr key={c.name}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.tdCenter}>{c.count}</td>
                    <td style={styles.tdRight}>{fmt(c.revenue)}</td>
                  </tr>
                ))}
                <tr style={styles.totalsRow}>
                  <td style={styles.td}><strong>Subtotal</strong></td>
                  <td style={styles.tdCenter}><strong>{colleges.reduce((s, c) => s + c.count, 0)}</strong></td>
                  <td style={styles.tdRight}><strong>{fmt(colleges.reduce((s, c) => s + c.revenue, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* By source (non-referral) */}
        {sourceOrder.filter(src => collegeBySource[src]?.length > 0).map(src => (
          <div key={src} className="page-break-avoid">
            <div style={{ ...styles.subTitle, color: '#64748B', borderColor: '#64748B' }}>{src}</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>College Name</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Count</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(collegeBySource[src] || []).sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                  <tr key={c.name}>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.tdCenter}>{c.count}</td>
                    <td style={styles.tdRight}>{fmt(c.revenue)}</td>
                  </tr>
                ))}
                <tr style={styles.totalsRow}>
                  <td style={styles.td}><strong>Subtotal</strong></td>
                  <td style={styles.tdCenter}><strong>{(collegeBySource[src] || []).reduce((s, c) => s + c.count, 0)}</strong></td>
                  <td style={styles.tdRight}><strong>{fmt((collegeBySource[src] || []).reduce((s, c) => s + c.revenue, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {collegeEntries.length === 0 && <p style={{ color: '#94A3B8', fontSize: '9.5pt' }}>No college data for this cohort.</p>}

        {/* ── Organization Report ── */}
        <div style={styles.sectionTitle}>Organization Report</div>

        {/* By each referral person */}
        {Object.entries(orgByReferral).map(([refKey, orgs]) => (
          <div key={refKey} className="page-break-avoid">
            <div style={styles.subTitle}>🔗 {refLabel(refKey)}</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Organization Name</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Count</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {orgs.sort((a, b) => a.name.localeCompare(b.name)).map(o => (
                  <tr key={o.name}>
                    <td style={styles.td}>{o.name}</td>
                    <td style={styles.tdCenter}>{o.count}</td>
                    <td style={styles.tdRight}>{fmt(o.revenue)}</td>
                  </tr>
                ))}
                <tr style={styles.totalsRow}>
                  <td style={styles.td}><strong>Subtotal</strong></td>
                  <td style={styles.tdCenter}><strong>{orgs.reduce((s, o) => s + o.count, 0)}</strong></td>
                  <td style={styles.tdRight}><strong>{fmt(orgs.reduce((s, o) => s + o.revenue, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* By source (non-referral) */}
        {sourceOrder.filter(src => orgBySource[src]?.length > 0).map(src => (
          <div key={src} className="page-break-avoid">
            <div style={{ ...styles.subTitle, color: '#64748B', borderColor: '#64748B' }}>{src}</div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Organization Name</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Count</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(orgBySource[src] || []).sort((a, b) => a.name.localeCompare(b.name)).map(o => (
                  <tr key={o.name}>
                    <td style={styles.td}>{o.name}</td>
                    <td style={styles.tdCenter}>{o.count}</td>
                    <td style={styles.tdRight}>{fmt(o.revenue)}</td>
                  </tr>
                ))}
                <tr style={styles.totalsRow}>
                  <td style={styles.td}><strong>Subtotal</strong></td>
                  <td style={styles.tdCenter}><strong>{(orgBySource[src] || []).reduce((s, o) => s + o.count, 0)}</strong></td>
                  <td style={styles.tdRight}><strong>{fmt((orgBySource[src] || []).reduce((s, o) => s + o.revenue, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {orgEntries.length === 0 && <p style={{ color: '#94A3B8', fontSize: '9.5pt' }}>No organization data for this cohort.</p>}

        {/* Footer */}
        <div style={{ borderTop: '1.5px solid #CBD5E1', marginTop: '32px', paddingTop: '10px', textAlign: 'center', fontSize: '8.5pt', color: '#94A3B8' }}>
          Global Knowledge Technologies · Lead with AI Workshop · Generated {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}
