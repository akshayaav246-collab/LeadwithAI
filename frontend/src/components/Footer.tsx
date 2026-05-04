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
              <li><Link href="/program/0">Getting Started with Generative AI</Link></li>
              <li><Link href="/program/1">Building AI Agents</Link></li>
              <li><Link href="/program/2">Building Products with AI</Link></li>
              <li><Link href="/program/3">Visual Storytelling & AI</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>NAVIGATE</h4>
            <ul className="footer-links">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/program">Program</Link></li>
              <li><Link href="/speakers">Speakers</Link></li>
              <li><Link href="/register">Register</Link></li>
              <li><a href="/brochure.pdf" download>Download Brochure</a></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4>CONTACT</h4>
            <div style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.78)' }}>
              +91-80-43003611
            </div>
            <a href="mailto:genquiry@globalknowledgetech.com" className="footer-email">
              genquiry@globalknowledgetech.com
            </a>
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
