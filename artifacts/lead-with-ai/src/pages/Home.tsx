import { Link } from "wouter";

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

      <section className="section" style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className="container">
          <div className="text-center">
            <span className="section-label">THE CASE FOR THE PROGRAM</span>
            <h2 className="section-headline">AI fluency is the new professional baseline. Here's why this program moves the needle.</h2>
          </div>

          <div className="grid-3">
            <div className="card">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
              <h4>Build real confidence, not just awareness</h4>
              <p style={{ marginTop: '0.5rem' }}>Most AI training stops at tool demos. This program is different. Every concept you learn is immediately applied to a live exercise, so you leave with skills you have actually tested — not just slides you have heard about. Confidence here means knowing what to do when the tool gives you something wrong.</p>
            </div>
            <div className="card">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="3"></circle>
                <path d="m12 10 1 2 2 .5-1.5 1.5.5 2.5-2-1-2 1 .5-2.5L9 12.5l2-.5z"></path>
              </svg>
              <h4>Walk away with a portfolio, not just a certificate</h4>
              <p style={{ marginTop: '0.5rem' }}>By the end of day two, you will have created a writing bot, a product prototype, and visual storytelling assets — tangible work you can show on your LinkedIn profile or in your next interview. The certificate reflects demonstrated output, not attendance alone.</p>
            </div>
            <div className="card">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-sienna)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <path d="M15 19v2l-4-4H5a2 2 0 0 1-2-2V7"></path>
              </svg>
              <h4>Learn from people who do this, not just teach it</h4>
              <p style={{ marginTop: '0.5rem' }}>Your mentors are working AI practitioners, technology leaders, and entrepreneurs — not consultants reading from slides. Expect direct insight from people who are building with AI every day, across machine learning, product development, content, and enterprise strategy.</p>
            </div>
          </div>

          <div className="stat-strip">
            <div className="stat-item">
              <h4>AI skills are growing fastest</h4>
              <p>Among the most in-demand competencies in global workplaces today</p>
            </div>
            <div className="stat-item">
              <h4>Teams are rebuilding around AI</h4>
              <p>Human-AI collaboration is reshaping how work gets organised and executed</p>
            </div>
            <div className="stat-item">
              <h4>Responsible use is a differentiator</h4>
              <p>Verifiable, ethical AI output is what separates leaders from followers</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ backgroundColor: 'var(--color-parchment)' }}>
        <div className="container">
          <div className="text-center">
            <span className="section-label">SIX THINGS YOU LEAVE WITH</span>
            <h2 className="section-headline">Six things you will leave with that you did not have when you arrived</h2>
          </div>

          <div className="grid-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="gain-card">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <h4>Career-ready AI confidence</h4>
              <p>Use AI to learn faster, communicate more clearly, and solve real problems — in college, at work, or as an entrepreneur.</p>
            </div>
            <div className="gain-card">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              <h4>A portfolio you can show</h4>
              <p>A writing bot, an AI workflow, a vibe-coded product prototype, and visual storytelling assets — all yours to keep and demonstrate.</p>
            </div>
            <div className="gain-card">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <h4>Faster learning habits</h4>
              <p>Use AI as a study partner — summarising, questioning, comparing, and revising at a pace that suits you, not a syllabus.</p>
            </div>
            <div className="gain-card">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>
              <h4>Tool-independent thinking</h4>
              <p>Work confidently across ChatGPT, Gemini, Claude, Copilot, and Perplexity — and whatever comes next — without needing to start over each time.</p>
            </div>
            <div className="gain-card">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>
              <h4>Responsible AI habits</h4>
              <p>Know when to trust AI output, when to push back, and when to keep the final decision firmly in your own hands.</p>
            </div>
            <div className="gain-card">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
              <h4>Resume and LinkedIn value</h4>
              <p>Graduate with a certificate and the language to articulate your AI skills clearly to employers, clients, and collaborators.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section schedule-section">
        <div className="container">
          <div className="text-center">
            <span className="section-label">THE SCHEDULE</span>
            <h2 className="section-headline" style={{ color: 'var(--color-white)' }}>Two days. Four modules. One cohort that learns by doing.</h2>
          </div>

          <div className="grid-2">
            <div className="schedule-card">
              <div className="day-label">DAY ONE</div>
              <div className="day-date">Saturday · 10 AM – 5 PM IST</div>
              <div className="day-divider"></div>
              
              <div className="session-block">
                <div className="session-time">10:30 AM – 1:00 PM</div>
                <div className="module-badge badge-teal">MODULE 1 · BEGINNER</div>
                <h4>Getting Started with Generative AI</h4>
                <p>Understand how large language models actually work, explore the major tools, and build your personal AI adoption mindset. Led by <strong>Sendhil Kumar S</strong>, Founder & Chairman.</p>
              </div>

              <div className="session-block">
                <div className="session-time">2:00 PM – 5:00 PM</div>
                <div className="module-badge badge-amber">MODULE 2 · INTERMEDIATE</div>
                <h4>Building Personalised AI Agents</h4>
                <p>Create a writing bot that sounds like you, map your first agentic workflow, and learn how to delegate repeatable tasks to AI. Led by <strong>Peter Darius</strong>, AI Technology Leader.</p>
              </div>
            </div>

            <div className="schedule-card">
              <div className="day-label">DAY TWO</div>
              <div className="day-date">Sunday · 10 AM – 6 PM IST</div>
              <div className="day-divider"></div>
              
              <div className="session-block">
                <div className="session-time">10:00 AM – 1:00 PM</div>
                <div className="module-badge badge-amber">MODULE 3 · INTERMEDIATE</div>
                <h4>Building Products Using AI</h4>
                <p>Go from idea to functional prototype using vibe coding and no-code AI platforms — no software engineering background required. Led by <strong>Dr. Radhika S</strong>, VP Technical.</p>
              </div>

              <div className="session-block">
                <div className="session-time">2:00 PM – 5:00 PM</div>
                <div className="module-badge badge-blue">MODULE 4 · ADVANCED</div>
                <h4>Visual Storytelling and Content Creation</h4>
                <p>Generate images, create video-ready scenes, and build creative assets for marketing, education, or personal branding. Led by <strong>Dinesh T</strong>, Chief Technology Officer.</p>
              </div>

              <div className="graduation-block">
                <div className="session-time">5:00 PM – 6:00 PM</div>
                <h4>Graduation Ceremony</h4>
                <p>Showcase your work, receive your certificate, and walk away with a LinkedIn-ready portfolio.</p>
              </div>
            </div>
          </div>

          <div className="text-center" style={{ marginTop: '2rem' }}>
            <Link href="/program" style={{ color: 'var(--color-sienna)', fontWeight: 'bold' }}>See the full program breakdown →</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className="container">
          <div className="text-center">
            <span className="section-label">WHO SHOULD ATTEND</span>
            <h2 className="section-headline">Designed for people who are done waiting for AI to "figure itself out"</h2>
            
            <div className="audience-chips">
              <div className="audience-chip">Students & Recent Graduates</div>
              <div className="audience-chip">Early-Career Professionals</div>
              <div className="audience-chip">Educators & Trainers</div>
              <div className="audience-chip">Team Leads & Managers</div>
              <div className="audience-chip">Entrepreneurs & Founders</div>
              <div className="audience-chip">Career Switchers into AI-Adjacent Roles</div>
            </div>

            <p style={{ maxWidth: '560px', margin: '0 auto', color: 'var(--color-umber)', fontSize: '1.1rem' }}>
              No prior coding knowledge or AI experience is required. If you can use a browser, you can build in this program. We focus on practical confidence — not theory overload.
            </p>

            <div style={{ marginTop: '2rem' }}>
              <Link href="/register" className="btn-primary">Register Now →</Link>
              <div style={{ marginTop: '0.75rem', color: 'var(--color-stone)', fontSize: '0.9rem' }}>Upcoming cohort · 2 days · Certificate on completion</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
