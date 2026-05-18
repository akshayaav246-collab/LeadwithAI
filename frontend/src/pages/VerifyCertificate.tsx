import React, { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { verifyCertificate } from '../lib/api';
import { DownloadCertificateButton } from '../components/DownloadCertificateButton';

export function VerifyCertificate() {
  const [match, params] = useRoute('/verify/:id');
  const [data, setData] = useState<{ fullName: string; eventName: string; issueDate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!match || !params.id) {
      setError('Invalid certificate link.');
      setLoading(false);
      return;
    }

    verifyCertificate(params.id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || 'Certificate not found or not yet available.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [match, params?.id]);

  if (loading) {
    return (
      <main className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p>Verifying Certificate...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Verification Failed</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '4rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 style={{ color: '#152446', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Verified Certificate</h2>
          <p style={{ color: 'var(--color-stone)' }}>This certificate is valid and issued by Global Knowledge Technologies.</p>
        </div>

        <div style={{ borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '1.5rem 0', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-stone)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issued To</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#152446', marginTop: '0.2rem' }}>{data.fullName}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-stone)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#152446', marginTop: '0.2rem' }}>{data.eventName}</div>
            </div>
            {data.issueDate && (
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-stone)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#152446', marginTop: '0.2rem' }}>
                  {new Date(data.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--color-umber)' }}>Download a copy of the certificate below:</p>
          <div style={{ maxWidth: '300px', margin: '0 auto' }}>
            <DownloadCertificateButton fullName={data.fullName} userId={params?.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
