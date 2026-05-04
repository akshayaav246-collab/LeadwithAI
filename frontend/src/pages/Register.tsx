import { useState, type FormEvent } from "react";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in all details.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    const phoneRegex = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setShowModal(true);
  };

  const handleConfirmPayment = () => {
    setShowModal(false);
    setSubmitted(true);
  };

  return (
    <>
      <main>
      <section className="register-section">
        <div className="register-bg" aria-hidden="true">
          <span className="register-bg-num">01</span>
          <span className="register-bg-num two">02</span>
        </div>
        <div className="register-wrap">
          <div className="register-eyebrow">REGISTER YOUR INTEREST</div>
          <h1 className="register-title">
            Save your seat in the next <span className="accent-italic">Lead with AI</span> cohort.
          </h1>
          <p className="register-sub">
            Share a few details  to get more updates
          </p>

          {submitted ? (
            <div className="register-success" role="status">
              <div className="register-success-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>Thank you, {name.split(" ")[0]}.</h3>
              <p>
                Proceeding to Payment Gateway...
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: "1.5rem" }}
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setEmail("");
                  setPhone("");
                }}
              >
                Go back
              </button>
            </div>
          ) : (
            <form className="register-form" onSubmit={handleSubmit} noValidate>
              <div className="register-field">
                <label htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anjali Menon"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-phone">Phone number</label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  autoComplete="tel"
                  required
                />
              </div>
              {error && <div className="register-error" role="alert">{error}</div>}
              <button type="submit" className="btn-primary register-submit" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                <span>Enroll Now →</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.9 }}>(Pay ₹500)</span>
              </button>
              <p className="register-note">
                Prefer email? Reach us directly at{" "}
                <a href="mailto:genquiry@globalknowledgetech.com" className="register-link">genquiry@globalknowledgetech.com</a>
              </p>
            </form>
          )}

        </div>
      </section>
    </main>
    {showModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Confirm Enrollment</h3>
          <p style={{ marginTop: '1rem', marginBottom: '2rem', color: 'var(--color-ink)' }}>Are you sure you want to proceed to payment (₹500)?</p>
          <div className="modal-actions">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleConfirmPayment} className="btn-primary">Yes, Proceed</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
