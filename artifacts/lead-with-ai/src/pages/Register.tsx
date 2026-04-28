import { useState, type FormEvent } from "react";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please fill in both your name and email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  return (
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
            Share a few details and our team will reach out with cohort dates, payment options, and onboarding instructions.
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
                We've noted your interest. Our team will be in touch at <strong>{email}</strong> with the next cohort details shortly.
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: "1.5rem" }}
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setEmail("");
                }}
              >
                Submit another response
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
              {error && <div className="register-error" role="alert">{error}</div>}
              <button type="submit" className="btn-primary register-submit">
                Register Now →
              </button>
              <p className="register-note">
                Prefer email? Reach us directly at{" "}
                <a href="mailto:info@gkt.edu.in" className="register-link">info@gkt.edu.in</a>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
