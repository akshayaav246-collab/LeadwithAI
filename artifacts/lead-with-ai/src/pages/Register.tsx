export function Register() {
  return (
    <main>
      <section className="section" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="register-container">
          <h2 style={{ marginBottom: '1rem' }}>Ready to Join the Next Cohort?</h2>
          <p style={{ color: 'var(--color-umber)', marginBottom: '3rem' }}>
            Registration details and cohort dates will be published here. In the meantime, reach out directly to secure your spot.
          </p>
          
          <div className="card">
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-espresso)' }}>Contact Us</h4>
            <div style={{ fontSize: '1.2rem', color: 'var(--color-sienna)', margin: '1.5rem 0' }}>
              info@gkt.edu.in
            </div>
            <a href="mailto:info@gkt.edu.in" className="btn-primary" style={{ display: 'block', width: '100%' }}>
              Get in Touch
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
