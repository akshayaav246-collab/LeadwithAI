import { Link } from "wouter";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-logo">Lead with AI</div>
            <div className="footer-sub">by Global Knowledge Technologies</div>
            <p className="footer-desc">
              A Global Knowledge Technologies initiative bringing practical AI education to students, professionals, and organisations ready to lead the next chapter of work.
            </p>
          </div>
          
          <div className="footer-col">
            <h4>PROGRAM</h4>
            <ul className="footer-links">
              <li><Link href="/program">Getting Started with Generative AI</Link></li>
              <li><Link href="/program">Building AI Agents</Link></li>
              <li><Link href="/program">Building Products with AI</Link></li>
              <li><Link href="/program">Visual Storytelling & AI</Link></li>
              <li><Link href="/program">Certificate Information</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>NAVIGATE</h4>
            <ul className="footer-links">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/program">Program</Link></li>
              <li><Link href="/speakers">Speakers</Link></li>
              <li><Link href="/register">Register</Link></li>
              <li><Link href="/register">Download Brochure</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>CONTACT</h4>
            <p style={{ marginBottom: '1rem' }}>
              For institutional registrations or group bookings, reach out to the GKT team directly.
            </p>
            <div style={{ color: 'var(--color-sienna)' }}>
              info@gkt.edu.in
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div>© 2025 Global Knowledge Technologies. All rights reserved.</div>
          <div>Lead with AI Program</div>
        </div>
      </div>
    </footer>
  );
}
