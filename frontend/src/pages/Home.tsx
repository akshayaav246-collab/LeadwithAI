import { Link } from "wouter";
import { SixThings } from "@/components/SixThings";
import { useEffect } from "react";
import { publicAsset } from "@/lib/assets";

export function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.scroll-fade-up, .scroll-scale-up, .scroll-slide-right, .scroll-slide-left').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">GLOBAL KNOWLEDGE TECHNOLOGIES · EVERY WEEKEND IN JUNE 2026 · 2-DAY PROFESSIONAL AI PROGRAM</div>
          <h1 className="hero-title">Lead with AI: Adopt, Implement and Transform</h1>
          <p className="hero-sub">
            Stop experimenting with AI, start executing with it. In two intensive days, you'll move from passive curiosity to building real workflows, products, and creative assets that you can immediately put to use in your career, projects, or organisation.
          </p>
          <div className="hero-ctas">
            <Link href="/register" className="btn-primary">Register Now →</Link>
            <a href={publicAsset("Lead_with_AI_Brochure.pdf")} download className="btn-secondary-light">Download the Brochure ↓</a>
          </div>
          
          {/* Upcoming Cohorts Board */}
          <div style={{
            marginTop: '2rem',
            marginBottom: '2.5rem',
            background: 'rgba(196, 149, 106, 0.08)',
            border: '1px solid rgba(196, 149, 106, 0.20)',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '680px',
            textAlign: 'center',
            boxSizing: 'border-box',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div style={{
              color: 'var(--color-sienna)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1rem'
            }}>
              Available June 2026 Cohorts (Choose during registration)
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '1rem',
              color: 'var(--color-white)',
              fontSize: '0.95rem'
            }}>
              <div style={{ padding: '0.75rem 0.5rem', border: '1px solid rgba(59, 139, 212, 0.3)', borderBottom: '3px solid var(--color-sienna)', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <strong>June 6 & 7</strong>
              </div>
              <div style={{ padding: '0.75rem 0.5rem', border: '1px solid rgba(59, 139, 212, 0.3)', borderBottom: '3px solid var(--color-sienna)', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <strong>June 13 & 14</strong>
              </div>
              <div style={{ padding: '0.75rem 0.5rem', border: '1px solid rgba(59, 139, 212, 0.3)', borderBottom: '3px solid var(--color-sienna)', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <strong>June 20 & 21</strong>
              </div>
              <div style={{ padding: '0.75rem 0.5rem', border: '1px solid rgba(59, 139, 212, 0.3)', borderBottom: '3px solid var(--color-sienna)', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <strong>June 27 & 28</strong>
              </div>
            </div>
          </div>

          <div className="hero-trust">
            <div className="hero-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Certificate on completion
            </div>
            <span className="hero-trust-divider">|</span>
            <div className="hero-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              4 hands-on modules
            </div>
            <span className="hero-trust-divider">|</span>
            <div className="hero-trust-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Industry practitioners as mentors
            </div>
          </div>
        </div>
      </section>

      <SixThings />

      <section className="section schedule-section">
        <div className="container schedule-container scroll-scale-up">
          <div className="text-center">
            <span className="section-label">THE SCHEDULE</span>
            <h2 className="section-headline" style={{ color: 'var(--color-white)' }}>Two days. Four modules. One cohort that learns by doing.</h2>
          </div>

          <div className="schedule-row">
            <article className="schedule-col">
              <div className="schedule-meta-top">
                <div className="schedule-number">01</div>
                <div className="schedule-level level-beginner">BEGINNER</div>
                <div className="schedule-day">DAY ONE · SATURDAY</div>
                <div className="schedule-time">10:00 AM – 1:00 PM</div>
              </div>
              <h3 className="schedule-module">Getting Started with Generative AI</h3>
              <p className="schedule-desc">
                Understand how large language models actually work, explore the major tools, and build your personal AI adoption mindset.
              </p>
            </article>

            <article className="schedule-col">
              <div className="schedule-meta-top">
                <div className="schedule-number">02</div>
                <div className="schedule-level level-intermediate">INTERMEDIATE</div>
                <div className="schedule-day">DAY ONE · SATURDAY</div>
                <div className="schedule-time">2:00 PM – 5:00 PM</div>
              </div>
              <h3 className="schedule-module">Building Personalised AI Agents</h3>
              <p className="schedule-desc">
                Create a writing bot that sounds like you, map your first agentic workflow, and learn how to delegate repeatable tasks to AI.
              </p>
            </article>

            <article className="schedule-col">
              <div className="schedule-meta-top">
                <div className="schedule-number">03</div>
                <div className="schedule-level level-intermediate">INTERMEDIATE</div>
                <div className="schedule-day">DAY TWO · SUNDAY</div>
                <div className="schedule-time">10:00 AM – 1:00 PM</div>
              </div>
              <h3 className="schedule-module">Building Products Using AI</h3>
              <p className="schedule-desc">
                Go from idea to functional prototype using vibe coding and no-code AI platforms, no software engineering background required.
              </p>
            </article>

            <article className="schedule-col">
              <div className="schedule-meta-top">
                <div className="schedule-number">04</div>
                <div className="schedule-level level-advanced">ADVANCED</div>
                <div className="schedule-day">DAY TWO · SUNDAY</div>
                <div className="schedule-time">2:00 PM – 5:00 PM</div>
              </div>
              <h3 className="schedule-module">Visual Storytelling and Content Creation</h3>
              <p className="schedule-desc">
                Generate images, create video-ready scenes, and build creative assets for marketing, education, or personal branding.
              </p>
            </article>
          </div>

          <div className="text-center" style={{ marginTop: '2.5rem' }}>
            <Link href="/program" className="schedule-cta">See the full program breakdown →</Link>
          </div>
        </div>
      </section>

      <section className="section who-section">
        <div className="container">
          <div className="who-grid">
            <div className="who-content-left scroll-slide-right">
              <span className="section-label">WHO SHOULD ATTEND</span>
              <h2 className="section-headline">Designed for people who are done waiting for AI to "figure itself out"</h2>
              
              <p style={{ color: '#334155', fontSize: '1.1rem', marginBottom: '2rem' }}>
                This program is curated for visionaries who understand that the future isn't about choosing between technology and humanity, but about mastering their intersection.
              </p>

              <div className="audience-chips" style={{ marginBottom: "0" }}>
                <div className="audience-chip" tabIndex={0}>Students &amp; Recent Graduates</div>
                <div className="audience-chip" tabIndex={0}>Early-Career Professionals</div>
                <div className="audience-chip" tabIndex={0}>Educators &amp; Trainers</div>
                <div className="audience-chip" tabIndex={0}>Team Leads &amp; Managers</div>
                <div className="audience-chip" tabIndex={0}>Entrepreneurs &amp; Founders</div>
                <div className="audience-chip" tabIndex={0}>Career Switchers into AI-Adjacent Roles</div>
              </div>
            </div>

            {/* ── Certificate Preview Card ── */}
            <div className="who-content-right scroll-slide-left">
              <div className="who-cert-card">
                <p className="who-cert-heading">What You Will Earn</p>
                <p className="who-cert-title">A Certificate of Completion</p>
                <p className="who-cert-subtitle">
                  Recognised proof of your AI skills — issued upon successfully completing both days of the program.
                </p>

                {/* Certificate visual */}
                <div className="who-cert-frame" style={{ padding: 0 }}>
                  <img src={publicAsset("Certificate.png")} alt="Certificate of Completion" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
