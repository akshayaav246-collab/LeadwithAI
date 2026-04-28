import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";

export function NavBar() {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const isActive = (path: string) => location === path;

  return (
    <nav className={scrolled ? "nav-scrolled" : ""}>
      <div className="nav-container">
        <Link href="/">
          <div>
            <span className="nav-logo-text">Lead with AI</span>
            <span className="nav-logo-sub">by Global Knowledge Technologies</span>
          </div>
        </Link>
        
        <div className="nav-links">
          <Link href="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
            Home
          </Link>
          <Link href="/program" className={`nav-link ${isActive("/program") ? "active" : ""}`}>
            Program
          </Link>
          <Link href="/speakers" className={`nav-link ${isActive("/speakers") ? "active" : ""}`}>
            Speakers
          </Link>
          <Link href="/register" className="btn-primary nav-btn">
            Register Now
          </Link>
        </div>

        <button 
          className="mobile-menu-btn" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Main navigation"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
      </div>

      <div className={`mobile-nav-panel ${menuOpen ? "open" : ""}`}>
        <div className="mobile-nav-links">
          <Link href="/" className="mobile-nav-link">Home</Link>
          <Link href="/program" className="mobile-nav-link">Program</Link>
          <Link href="/speakers" className="mobile-nav-link">Speakers</Link>
          <Link href="/register" className="mobile-nav-link">Register Now</Link>
        </div>
      </div>
    </nav>
  );
}
