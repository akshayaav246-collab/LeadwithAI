import { Link } from "wouter";

export function Program() {
  return (
    <main>
      <section className="page-header">
        <div className="container">
          <div className="breadcrumb">Home / Program</div>
          <h1 style={{ color: 'var(--color-white)', maxWidth: '800px', marginBottom: '1.5rem' }}>
            The Full Program — What Happens, When, and Why
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '680px' }}>
            Every session in this program is built around a single principle: if you cannot do it by the end of the day, you have not really learned it. Across two days and four modules, you move through a deliberate progression — from understanding AI clearly, to building with it, to producing outputs that reflect your own thinking, creativity, and goals.
          </p>
        </div>
      </section>

      <section className="section" style={{ backgroundColor: 'var(--color-cream)' }}>
        <div className="container">
          <span className="section-label">FULL SCHEDULE</span>
          <h2 style={{ marginBottom: '3rem' }}>Two days. Four modules.</h2>

          <div className="timeline-table">
            <div>
              <div className="timeline-col-header">DAY ONE — SATURDAY</div>
              
              <div className="timeline-row">
                <div className="timeline-time">10:00 AM</div>
                <div className="timeline-desc">
                  <div style={{ background: 'var(--color-parchment)', padding: '0.5rem 1rem', borderRadius: '2px' }}>
                    <strong>Onboarding & Orientation</strong> — Welcome, goals, and how the program works
                  </div>
                </div>
              </div>

              <div className="timeline-row">
                <div className="timeline-time">10:30 AM –<br/>1:00 PM</div>
                <div className="timeline-desc">
                  <div className="module-badge badge-teal">BEGINNER</div>
                  <div style={{ fontWeight: 'bold' }}>Module 1: Getting Started with Generative AI</div>
                </div>
              </div>

              <div className="timeline-row timeline-break">
                <div className="timeline-time">1:00 – 2:00 PM</div>
                <div className="timeline-desc">Lunch Break</div>
              </div>

              <div className="timeline-row">
                <div className="timeline-time">2:00 – 5:00 PM</div>
                <div className="timeline-desc">
                  <div className="module-badge badge-amber">INTERMEDIATE</div>
                  <div style={{ fontWeight: 'bold' }}>Module 2: Building Personalised AI Agents</div>
                </div>
              </div>
            </div>

            <div>
              <div className="timeline-col-header">DAY TWO — SUNDAY</div>
              
              <div className="timeline-row">
                <div className="timeline-time">10:00 AM –<br/>1:00 PM</div>
                <div className="timeline-desc">
                  <div className="module-badge badge-amber">INTERMEDIATE</div>
                  <div style={{ fontWeight: 'bold' }}>Module 3: Building Products Using AI</div>
                </div>
              </div>

              <div className="timeline-row timeline-break">
                <div className="timeline-time">1:00 – 2:00 PM</div>
                <div className="timeline-desc">Lunch Break</div>
              </div>

              <div className="timeline-row">
                <div className="timeline-time">2:00 – 5:00 PM</div>
                <div className="timeline-desc">
                  <div className="module-badge badge-blue">ADVANCED</div>
                  <div style={{ fontWeight: 'bold' }}>Module 4: Visual Storytelling & Content Creation</div>
                </div>
              </div>

              <div className="timeline-row" style={{ borderBottom: 'none' }}>
                <div className="timeline-time">5:00 – 6:00 PM</div>
                <div className="timeline-desc">
                  <div style={{ background: 'var(--color-sienna)', color: 'white', padding: '0.5rem 1rem', borderRadius: '2px', fontWeight: 'bold' }}>
                    Graduation Ceremony
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module 1 */}
      <section className="module-section bg-white">
        <div className="container">
          <span className="section-label">MODULE 1 · SATURDAY MORNING · BEGINNER</span>
          <h2>Getting Started with Generative AI</h2>
          <p style={{ maxWidth: '700px', color: 'var(--color-umber)', marginTop: '1rem' }}>
            Before you can use AI well, you need a clear mental model of what it actually is — and is not. This session cuts through the noise. You will understand how large language models generate text, where they are genuinely useful, where they fail, and how to build the right habits from day one.
          </p>

          <div className="module-split">
            <div>
              <h4>What you'll learn</h4>
              <ul className="module-list">
                <li>How to explain AI, generative models, and large language models in plain language to any audience</li>
                <li>How to evaluate which AI tool is right for which task — and why prompt quality matters more than tool choice</li>
                <li>How to identify the right opportunities for AI in your day-to-day study or work, without over-relying on it</li>
                <li>How to build a personal AI adoption mindset grounded in safety, clarity, and practical use</li>
              </ul>
            </div>
            <div>
              <h4>What you'll do</h4>
              <ul className="module-list">
                <li>AI fluency self-assessment — find out where you actually stand before the day begins</li>
                <li>Hands-on exploration of text, image, research, and productivity tools side by side, in real time</li>
                <li>Live prompting practice: ask, refine, verify, and iterate until the output is genuinely useful</li>
                <li>Future-of-AI discussion: what is on the horizon and how to stay ready without chasing every trend</li>
              </ul>
            </div>
          </div>

          <div className="resources-strip">
            <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)', marginRight: '0.5rem' }}>Resources:</span>
            <div className="resource-pill">AI Tools Checklist</div>
            <div className="resource-pill">Prompt Starter Kit</div>
            <div className="resource-pill">Self-Assessment Worksheet</div>
            <div className="resource-pill">Concept Quiz</div>
            <div className="resource-pill">Personal AI Learning Plan</div>
          </div>

          <div className="speaker-callout">
            <div className="speaker-avatar-small"></div>
            <div className="speaker-text">Led by <strong>Sendhil Kumar S</strong> — Founder & Chairman, Global Knowledge Technologies</div>
          </div>
        </div>
      </section>

      {/* Module 2 */}
      <section className="module-section bg-parch">
        <div className="container">
          <span className="section-label">MODULE 2 · SATURDAY AFTERNOON · INTERMEDIATE</span>
          <h2>Building Personalised AI Agents</h2>
          <p style={{ maxWidth: '700px', color: 'var(--color-umber)', marginTop: '1rem' }}>
            Generic AI outputs are useful for everyone — and therefore not particularly useful for you. This session teaches you to build something personal: an AI agent that reflects your voice, understands your goals, and can handle the repetitive parts of your work so you can focus on what requires human judgment.
          </p>

          <div className="module-split">
            <div>
              <h4>What you'll learn</h4>
              <ul className="module-list">
                <li>How to create a writing bot that matches your tone, structure, and intended audience</li>
                <li>The anatomy of an effective AI agent: goal, role, context, memory, and evaluation criteria</li>
                <li>How to design workflows where AI handles drafting and reviewing while you handle final decisions</li>
                <li>How to test and improve agent outputs so they stay accurate and consistent over time</li>
              </ul>
            </div>
            <div>
              <h4>What you'll do</h4>
              <ul className="module-list">
                <li>Build your own writing bot, personalised to your style and communication goals</li>
                <li>Create a reusable prompt library for studying, working, and communicating across contexts</li>
                <li>Map a real workflow from your own life and decide which steps benefit from AI and which must stay human-led</li>
                <li>Run iteration cycles to debug and refine your agent until it produces consistent, useful outputs</li>
              </ul>
            </div>
          </div>

          <div className="resources-strip">
            <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)', marginRight: '0.5rem' }}>Resources:</span>
            <div className="resource-pill">Agent Design Canvas</div>
            <div className="resource-pill">Writing-Style Capture Worksheet</div>
            <div className="resource-pill">Workflow Mapping Template</div>
            <div className="resource-pill">Prompt Library</div>
            <div className="resource-pill">Output Evaluation Checklist</div>
          </div>

          <div className="speaker-callout">
            <div className="speaker-avatar-small"></div>
            <div className="speaker-text">Led by <strong>Peter Darius</strong> — AI Technology Leader</div>
          </div>
        </div>
      </section>

      {/* Module 3 */}
      <section className="module-section bg-white">
        <div className="container">
          <span className="section-label">MODULE 3 · SUNDAY MORNING · INTERMEDIATE</span>
          <h2>Building Products Using AI</h2>
          <p style={{ maxWidth: '700px', color: 'var(--color-umber)', marginTop: '1rem' }}>
            You do not need to know how to code to build something real. This session introduces vibe coding — using AI to translate ideas into functional product experiences — and walks you through the full process of going from a problem worth solving to a working prototype you can demo by lunchtime.
          </p>

          <div className="module-split">
            <div>
              <h4>What you'll learn</h4>
              <ul className="module-list">
                <li>How to define a clear product problem, a user persona, and the minimum set of features that make the idea worth building</li>
                <li>How to use AI to generate product requirements, user flows, and screen logic — without writing a single line of code</li>
                <li>How to navigate no-code and AI-assisted platforms for rapid prototyping and iteration</li>
                <li>How to test a prototype with real feedback and iterate based on what you learn from the room</li>
              </ul>
            </div>
            <div>
              <h4>What you'll do</h4>
              <ul className="module-list">
                <li>Turn a problem statement into a product concept with AI assistance in under an hour</li>
                <li>Build a user journey and feature backlog, then prioritise it for a one-day build</li>
                <li>Prototype a simple product flow using vibe coding platforms — functional and demonstrable</li>
                <li>Run a live mini-demo and collect structured improvement feedback from the group</li>
              </ul>
            </div>
          </div>

          <div className="resources-strip">
            <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)', marginRight: '0.5rem' }}>Resources:</span>
            <div className="resource-pill">Product Idea Canvas</div>
            <div className="resource-pill">User Persona Worksheet</div>
            <div className="resource-pill">AI Coding Prompt Pack</div>
            <div className="resource-pill">Prototype Checklist</div>
            <div className="resource-pill">Testing Rubric</div>
          </div>

          <div className="speaker-callout">
            <div className="speaker-avatar-small"></div>
            <div className="speaker-text">Led by <strong>Dr. Radhika S</strong> — VP Technical</div>
          </div>
        </div>
      </section>

      {/* Module 4 */}
      <section className="module-section bg-parch">
        <div className="container">
          <span className="section-label">MODULE 4 · SUNDAY AFTERNOON · ADVANCED</span>
          <h2>Visual Storytelling & Content Creation Using AI</h2>
          <p style={{ maxWidth: '700px', color: 'var(--color-umber)', marginTop: '1rem' }}>
            Ideas do not travel on text alone. This session teaches you to create compelling visual content using AI — from brand-aligned images to video-ready scenes — and to apply the editorial and ethical judgment that separates credible content from content that merely looks generated.
          </p>

          <div className="module-split">
            <div>
              <h4>What you'll learn</h4>
              <ul className="module-list">
                <li>How to write image prompts that produce realistic, brand-consistent visuals on the first attempt</li>
                <li>How to convert static images into short-form and long-form video concepts using AI workflows</li>
                <li>How to plan content strategies for marketing, education, and portfolio storytelling</li>
                <li>How to apply brand-safety and ethical checks before publishing anything AI-generated</li>
              </ul>
            </div>
            <div>
              <h4>What you'll do</h4>
              <ul className="module-list">
                <li>Design a campaign concept from scratch and build a visual storyboard around it</li>
                <li>Generate multiple image prompt variations and choose the strongest creative direction</li>
                <li>Convert static visuals into video scenes, complete with script, voice, and pacing notes</li>
                <li>Present a mini creative asset with clear positioning rationale and intended audience</li>
              </ul>
            </div>
          </div>

          <div className="resources-strip">
            <span style={{ fontWeight: 'bold', color: 'var(--color-espresso)', marginRight: '0.5rem' }}>Resources:</span>
            <div className="resource-pill">Image Prompt Templates</div>
            <div className="resource-pill">Storyboard Worksheet</div>
            <div className="resource-pill">Video Scene Planner</div>
            <div className="resource-pill">Creative Brief Format</div>
            <div className="resource-pill">Brand-Safety Checklist</div>
            <div className="resource-pill">Content Review Rubric</div>
          </div>

          <div className="speaker-callout">
            <div className="speaker-avatar-small"></div>
            <div className="speaker-text">Led by <strong>Dinesh T</strong> — Chief Technology Officer</div>
          </div>
        </div>
      </section>

      {/* Skills Grid */}
      <section className="section" style={{ background: 'var(--color-espresso)' }}>
        <div className="container">
          <span className="section-label">SKILLS COVERED</span>
          <h2 style={{ color: 'var(--color-white)', marginBottom: '3rem' }}>Ten skills. Two days. All connected to a real output you produce.</h2>

          <div className="grid-2">
            <div className="skill-card">
              <div className="skill-num">01</div>
              <h4>Power Prompting</h4>
              <p>Ask precise questions, set constraints, and iterate until the output is exactly right</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">02</div>
              <h4>AI-First Mindset</h4>
              <p>Identify where AI genuinely adds value across learning, productivity, and creative work</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">03</div>
              <h4>Custom Writing Bot</h4>
              <p>Build a personalised assistant that reflects your voice and communication goals</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">04</div>
              <h4>Agent Workflows</h4>
              <p>Map tasks, connect tools, and design automations you will actually use in real work</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">05</div>
              <h4>Vibe Coding</h4>
              <p>Prototype functional products without needing traditional software engineering skills</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">06</div>
              <h4>Verification Techniques</h4>
              <p>Check facts, quality, safety, and hallucinations before acting on AI output</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">07</div>
              <h4>Visual Storytelling</h4>
              <p>Create realistic images and convert them into short or long-form video concepts</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">08</div>
              <h4>Responsible Use</h4>
              <p>Know when AI should lead, when you should review, and when to keep the human in charge</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">09</div>
              <h4>Workflow Orchestration</h4>
              <p>Connect AI outputs across research, writing, product, and creative pipelines</p>
            </div>
            <div className="skill-card">
              <div className="skill-num">10</div>
              <h4>AI Leadership Translation</h4>
              <p>Communicate AI opportunities clearly to peers, teams, and decision-makers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate Section */}
      <section className="section" style={{ background: 'var(--color-cream)' }}>
        <div className="container">
          <span className="section-label">CERTIFICATION</span>
          <h2 style={{ marginBottom: '3rem' }}>Graduate with proof — not just knowledge</h2>

          <div className="cert-split">
            <div>
              <p style={{ marginBottom: '1.5rem' }}>
                Participants who complete both days of the program receive the <strong>Lead with AI Certificate</strong>, issued by Global Knowledge Technologies. The certificate is designed to be added directly to your LinkedIn profile, included in your resume, and referenced in job applications or client conversations.
              </p>
              <p>
                The certificate reflects not just your attendance, but demonstrated output — you will have the portfolio work to support every claim you make. A writing bot. A product prototype. A visual storytelling asset. A prompt library. These are the proof behind the credential.
              </p>
            </div>
            <div className="cert-mockup">
              <div className="cert-title">Lead with AI Certificate</div>
              <div className="cert-org">Global Knowledge Technologies</div>
              <div className="cert-rule"></div>
              <div className="cert-footer">Issued upon completion of both program days.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
