import { Link } from "wouter";
import { SixThings } from "@/components/SixThings";

export function Home() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">GLOBAL KNOWLEDGE TECHNOLOGIES · 2-DAY PROFESSIONAL AI PROGRAM</div>
          <h1 className="hero-title">Lead with AI: Adopt, Implement and Transform</h1>
          <p className="hero-sub">
            Stop experimenting with AI — start executing with it. In two intensive days, you'll move from passive curiosity to building real workflows, products, and creative assets that you can immediately put to use in your career, projects, or organisation.
          </p>
          <div className="hero-ctas">
            <Link href="/register" className="btn-primary">Register Now →</Link>
            <Link href="/register" className="btn-secondary-light">Download the Brochure ↓</Link>
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
        <div className="container schedule-container">
          <div className="text-center">
            <span className="section-label">THE SCHEDULE</span>
            <h2 className="section-headline" style={{ color: 'var(--color-white)' }}>Two days. Four modules. One cohort that learns by doing.</h2>
          </div>

          <div className="schedule-row">
            <article className="schedule-col">
              <div className="schedule-day">DAY ONE · SATURDAY</div>
              <div className="schedule-time">10:30 AM – 1:00 PM</div>
              <div className="schedule-level level-beginner">BEGINNER</div>
              <h3 className="schedule-module">Getting Started with Generative AI</h3>
              <p className="schedule-desc">
                Understand how large language models actually work, explore the major tools, and build your personal AI adoption mindset.
              </p>
              <div className="schedule-led">Led by <strong>Sendhil Kumar S</strong>, Founder &amp; Chairman</div>
            </article>

            <article className="schedule-col">
              <div className="schedule-day">DAY ONE · SATURDAY</div>
              <div className="schedule-time">2:00 PM – 5:00 PM</div>
              <div className="schedule-level level-intermediate">INTERMEDIATE</div>
              <h3 className="schedule-module">Building Personalised AI Agents</h3>
              <p className="schedule-desc">
                Create a writing bot that sounds like you, map your first agentic workflow, and learn how to delegate repeatable tasks to AI.
              </p>
              <div className="schedule-led">Led by <strong>Peter Darius</strong>, AI Technology Leader</div>
            </article>

            <article className="schedule-col">
              <div className="schedule-day">DAY TWO · SUNDAY</div>
              <div className="schedule-time">10:00 AM – 1:00 PM</div>
              <div className="schedule-level level-intermediate">INTERMEDIATE</div>
              <h3 className="schedule-module">Building Products Using AI</h3>
              <p className="schedule-desc">
                Go from idea to functional prototype using vibe coding and no-code AI platforms — no software engineering background required.
              </p>
              <div className="schedule-led">Led by <strong>Dr. Radhika S</strong>, VP Technical</div>
            </article>

            <article className="schedule-col">
              <div className="schedule-day">DAY TWO · SUNDAY</div>
              <div className="schedule-time">2:00 PM – 5:00 PM</div>
              <div className="schedule-level level-advanced">ADVANCED</div>
              <h3 className="schedule-module">Visual Storytelling and Content Creation</h3>
              <p className="schedule-desc">
                Generate images, create video-ready scenes, and build creative assets for marketing, education, or personal branding.
              </p>
              <div className="schedule-led">Led by <strong>Dinesh T</strong>, Chief Technology Officer</div>
            </article>
          </div>

          <div className="text-center" style={{ marginTop: '2.5rem' }}>
            <Link href="/program" className="schedule-cta">See the full program breakdown →</Link>
          </div>
        </div>
      </section>

      <section className="section who-section">
        <div className="container">
          <div className="text-center">
            <span className="section-label">WHO SHOULD ATTEND</span>
            <h2 className="section-headline">Designed for people who are done waiting for AI to "figure itself out"</h2>

            <div className="audience-chips">
              <div className="audience-chip" tabIndex={0}>Students &amp; Recent Graduates</div>
              <div className="audience-chip" tabIndex={0}>Early-Career Professionals</div>
              <div className="audience-chip" tabIndex={0}>Educators &amp; Trainers</div>
              <div className="audience-chip" tabIndex={0}>Team Leads &amp; Managers</div>
              <div className="audience-chip" tabIndex={0}>Entrepreneurs &amp; Founders</div>
              <div className="audience-chip" tabIndex={0}>Career Switchers into AI-Adjacent Roles</div>
            </div>

            <p style={{ maxWidth: '560px', margin: '0 auto', color: 'var(--color-umber)', fontSize: '1.1rem' }}>
              No prior coding knowledge or AI experience is required. If you can use a browser, you can build in this program. We focus on practical confidence — not theory overload.
            </p>

            <div style={{ marginTop: '2rem' }}>
              <Link href="/register" className="btn-primary">Register Now →</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
