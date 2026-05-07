import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, type RegisteredEvent } from '@/context/AuthContext';
import * as api from '@/lib/api';

export function Profile() {
  const { user, token, logout, updateUser } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/register');
      return;
    }
    // Refresh user data from server
    api.getMe(token)
      .then(({ user: freshUser }) => {
        updateUser(freshUser);
      })
      .catch(() => {
        // Token invalid — log out
        logout();
        navigate('/register');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main>
        <section className="profile-section">
          <div className="profile-loading">
            <div className="profile-spinner" />
            <p>Loading your profile…</p>
          </div>
        </section>
      </main>
    );
  }

  if (!user) return null;

  const confirmedEvents = user.registeredEvents?.filter((e) => e.paymentStatus === 'confirmed') ?? [];
  const pendingEvents = user.registeredEvents?.filter((e) => e.paymentStatus !== 'confirmed') ?? [];

  // Deduplicate events based on eventName (keep the one with 'confirmed' status if there are multiple)
  const uniqueEventsMap = new Map<string, RegisteredEvent>();
  (user.registeredEvents || []).forEach(evt => {
    const existing = uniqueEventsMap.get(evt.eventName);
    if (!existing || (existing.paymentStatus !== 'confirmed' && evt.paymentStatus === 'confirmed')) {
      uniqueEventsMap.set(evt.eventName, evt);
    }
  });
  const uniqueEvents = Array.from(uniqueEventsMap.values());

  async function handlePayNow() {
    setPayError('');
    try {
      const order = await api.createOrder(token!);

      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
      });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Global Knowledge Technologies',
        description: 'Lead with AI — Workshop Registration',
        order_id: order.orderId,
        prefill: {
          name: order.userName,
          email: order.userEmail,
          contact: order.userPhone,
        },
        theme: { color: '#C4956A' },
        handler: async (response: any) => {
          try {
            await api.verifyPayment(token!, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const { user: freshUser } = await api.getMe(token!);
            updateUser(freshUser);
          } catch (err: any) {
            setPayError(err.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setPayError('Payment was cancelled.');
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPayError(err.message || 'Failed to initiate payment.');
    }
  }

  return (
    <main>
      <section className="profile-section">
        {/* ── Hero strip ── */}
        <div className="profile-hero">
          <div className="container">
            <div className="profile-hero-inner">
              <div className="profile-avatar">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="profile-hero-text">
                <h1 className="profile-name">{user.fullName}</h1>
                <div className="profile-type-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {user.userType === 'student' ? (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.34a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.832l8.57 3.698a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>Student</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Working Professional</>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container profile-container">
          {/* ── Details Card ── */}
          <div className="profile-card">
            <div className="profile-card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <h2>Personal Details</h2>
            </div>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span className="profile-detail-label">Full Name</span>
                <span className="profile-detail-value">{user.fullName}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value">{user.email}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Phone</span>
                <span className="profile-detail-value">{user.phone}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Account Type</span>
                <span className="profile-detail-value">{user.userType === 'student' ? 'Student' : 'Working Professional'}</span>
              </div>

              {user.userType === 'student' && (
                <>
                  {user.collegeName && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">College</span>
                      <span className="profile-detail-value">{user.collegeName}</span>
                    </div>
                  )}
                  {user.course && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Course</span>
                      <span className="profile-detail-value">{user.course}</span>
                    </div>
                  )}
                  {user.year && (
                    <div className="profile-detail-item">
                      <span className="profile-detail-label">Year</span>
                      <span className="profile-detail-value">{user.year}</span>
                    </div>
                  )}
                </>
              )}

              {user.userType === 'working' && user.domain && (
                <div className="profile-detail-item">
                  <span className="profile-detail-label">Domain</span>
                  <span className="profile-detail-value">{user.domain}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── My Tickets Card ── */}
          <div className="profile-card">
            <div className="profile-card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
              </svg>
              <h2>My Tickets</h2>
            </div>

            {uniqueEvents.length === 0 ? (
              <div className="profile-empty-tickets">
                <p>No events registered yet.</p>
                <a href="/register" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Register Now →</a>
              </div>
            ) : (
              <div className="ticket-list">
                {payError && <div className="register-error" style={{ marginBottom: '1rem' }}>{payError}</div>}
                {uniqueEvents.map((evt: RegisteredEvent, i: number) => (
                  <div key={i} className={`ticket-card ${evt.paymentStatus}`}>
                    <div className="ticket-card-left">
                      <div className="ticket-event-name">{evt.eventName}</div>
                      <div className="ticket-meta">
                        {evt.registeredAt && (
                          <span>Registered {new Date(evt.registeredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        )}
                      </div>
                      {evt.paymentStatus === 'confirmed' && (
                        <p style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--color-sienna)', fontFamily: 'var(--font-sans)' }}>
                          Check your mail for more updates
                        </p>
                      )}
                    </div>
                    <div className="ticket-card-right">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span
                          className={`ticket-badge badge-${evt.paymentStatus}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {evt.paymentStatus === 'confirmed' ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Payment Completed</>
                          ) : evt.paymentStatus === 'failed' ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Payment Failed</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Payment Pending</>
                          )}
                        </span>
                        {evt.paymentStatus === 'confirmed' && (
                          <a
                            href="https://zoom.us/j/00000000000"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: 'rgba(37,99,235,0.08)',
                              color: '#1d4ed8',
                              border: '1px solid rgba(37,99,235,0.2)',
                              borderRadius: '100px',
                              padding: '0.3rem 0.9rem',
                              fontSize: '0.82rem',
                              fontFamily: 'var(--font-sans)',
                              fontWeight: 600,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/></svg>
                            Join Zoom Meeting
                          </a>
                        )}
                      </div>
                      {evt.paymentStatus === 'pending' && (
                        <button className="btn-primary" onClick={handlePayNow} style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'inline-block' }}>Complete Payment →</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
