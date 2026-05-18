import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";

type Module = {
  number: string;
  badge: string;
  badgeClass: string;
  day: string;
  time: string;
  title: string;
  description: string;
  learn: string[];
  build: string[];
  speakerName: string;
  speakerRole: string;
  speakerInitials: string;
  speakerId: string;
};

const MODULES: Module[] = [
  {
    number: "01",
    badge: "BEGINNER",
    badgeClass: "level-beginner",
    day: "Day One · Saturday",
    time: "10:00 AM – 1:00 PM",
    title: "Getting Started with Generative AI",
    description:
      "Before you can use AI well, you need a clear mental model of what it actually is, and is not. This session cuts through the noise. You will understand how large language models generate text, where they are genuinely useful, where they fail, and how to build the right habits from day one.",
    learn: [
      "How to explain AI, generative models, and large language models in plain language",
      "How to pick the right AI tool for the job, and why how you ask matters more than which tool you use",
      "How to spot where AI can genuinely save you time in your daily work or studies",
      "How to approach AI with confidence — safely, clearly, and with real purpose",
    ],
    build: [
      "A quick self-assessment to show you exactly where you are before we start",
      "Trying the most useful AI tools yourself — text, image, research, and productivity — all in one session",
      "Real prompting practice where you keep going until the result is actually worth using",
      "A clear-eyed look at where AI is heading and what that means for you",
    ],
    speakerName: "Sendhil Kumar S",
    speakerRole: "Founder & Chairman",
    speakerInitials: "SK",
    speakerId: "sk",
  },
  {
    number: "02",
    badge: "INTERMEDIATE",
    badgeClass: "level-intermediate",
    day: "Day One · Saturday",
    time: "2:00 PM – 5:00 PM",
    title: "Building Personalised AI Agents",
    description:
      "Generic AI outputs are useful for everyone, and therefore not particularly useful for you. This session teaches you to build something personal: an AI agent that reflects your voice, understands your goals, and can handle the repetitive parts of your work so you can focus on what requires human judgment.",
    learn: [
      "How to create a writing bot that matches your tone, structure, and intended audience",
      "The anatomy of an effective AI agent: goal, role, context, memory, and evaluation criteria",
      "How to design workflows where AI drafts and reviews while you handle final decisions",
      "How to test and improve agent outputs so they stay accurate over time",
    ],
    build: [
      "Build your own writing bot, personalised to your style and communication goals",
      "Create a reusable prompt library for studying, working, and communicating",
      "Map a real workflow from your own life and decide which steps benefit from AI",
      "Run iteration cycles to debug and refine your agent until outputs stay consistent",
    ],
    speakerName: "Dr. Radhika S",
    speakerRole: "VP Technical",
    speakerInitials: "RS",
    speakerId: "rs",
  },
  {
    number: "03",
    badge: "INTERMEDIATE",
    badgeClass: "level-intermediate",
    day: "Day Two · Sunday",
    time: "10:00 AM – 1:00 PM",
    title: "Building Products Using AI",
    description:
      "You do not need to know how to code to build something real. This session introduces vibe coding, using AI to translate ideas into functional product experiences, and walks you through the full process of going from a problem worth solving to a working prototype you can demo by lunchtime.",
    learn: [
      "How to define a clear product problem, a user persona, and the minimum viable feature set",
      "How to use AI to generate product requirements, user flows, and screen logic",
      "How to navigate no-code and AI-assisted platforms for rapid prototyping",
      "How to test a prototype with real feedback and iterate based on what you learn",
    ],
    build: [
      "Turn a problem statement into a product concept with AI assistance in under an hour",
      "Build a user journey and feature backlog, then prioritise it for a one-day build",
      "Prototype a simple product flow using vibe coding platforms, functional and demoable",
      "Run a live mini-demo and collect structured improvement feedback from the group",
    ],
    speakerName: "Peter Darius",
    speakerRole: "AI Technology Leader",
    speakerInitials: "PD",
    speakerId: "pd",
  },
  {
    number: "04",
    badge: "ADVANCED",
    badgeClass: "level-advanced",
    day: "Day Two · Sunday",
    time: "2:00 PM – 5:00 PM",
    title: "Visual Storytelling & Content Creation",
    description:
      "Ideas do not travel on text alone. This session teaches you to create compelling visual content using AI, from brand-aligned images to video-ready scenes, and to apply the editorial and ethical judgment that separates credible content from content that merely looks generated.",
    learn: [
      "How to write image prompts that produce realistic, brand-consistent visuals on the first attempt",
      "How to convert static images into short-form and long-form video concepts",
      "How to plan content strategies for marketing, education, and portfolio storytelling",
      "How to apply brand-safety and ethical checks before publishing AI-generated work",
    ],
    build: [
      "Design a campaign concept from scratch and build a visual storyboard around it",
      "Generate multiple image prompt variations and choose the strongest creative direction",
      "Convert static visuals into video scenes with script, voice, and pacing notes",
      "Present a mini creative asset with clear positioning rationale and intended audience",
    ],
    speakerName: "Dinesh T",
    speakerRole: "Chief Technology Officer",
    speakerInitials: "DT",
    speakerId: "dt",
  },
];

export function Program() {
  const [match, params] = useRoute("/program/:moduleIndex");
  
  const [activeIndex, setActiveIndex] = useState(() => {
    if (match && params?.moduleIndex) {
      const idx = parseInt(params.moduleIndex, 10);
      if (!isNaN(idx) && idx >= 0 && idx < MODULES.length) return idx;
    }
    return 0;
  });
  
  const [tab, setTab] = useState<"learn" | "build">("learn");
  const [visibleModule, setVisibleModule] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (match && params?.moduleIndex) {
      const idx = parseInt(params.moduleIndex, 10);
      if (!isNaN(idx) && idx >= 0 && idx < MODULES.length) {
        setActiveIndex(idx);
        setTimeout(() => {
          panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [match, params?.moduleIndex]);

  useEffect(() => {
    setVisibleModule(false);
    const t = window.setTimeout(() => setVisibleModule(true), 30);
    return () => window.clearTimeout(t);
  }, [activeIndex, tab]);

  const handleSelect = (i: number) => {
    if (i === activeIndex) return;
    setActiveIndex(i);
    setTab("learn");
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const active = MODULES[activeIndex];
  const items = tab === "learn" ? active.learn : active.build;

  return (
    <main>
      <section className="program-hero">
        <div className="container">
          <div className="program-hero-eyebrow">THE PROGRAM</div>
          <h1 className="program-hero-title">
            Four interactive modules. <span className="accent-italic">One transformation.</span>
          </h1>
          <p className="program-hero-sub" style={{ marginBottom: '1.25rem' }}>
            Every session is designed around one principle: learn by building.<br/>
            Pick a module to explore or move through them in order.
          </p>

          <div style={{
            background: 'var(--color-sienna)',
            borderRadius: '8px',
            padding: '0.8rem 1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '2.5rem',
            color: 'var(--color-white)'
          }}>
            <div className="program-hero-sub" style={{ margin: 0, color: 'inherit', fontWeight: 500 }}>
              <strong style={{ fontWeight: 700 }}>Graduation Ceremony</strong> · Day Two, 31st May 2026
            </div>
            <div style={{
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '100px',
              padding: '0.3rem 0.8rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}>
              5:00 – 6:00 PM IST
            </div>
          </div>

          <div className="program-modules-rail" role="tablist" aria-label="Modules">
            {MODULES.map((m, i) => (
              <button
                key={m.number}
                role="tab"
                aria-selected={activeIndex === i}
                onClick={() => handleSelect(i)}
                className={`program-rail-item ${activeIndex === i ? "is-active" : ""}`}
                type="button"
              >
                <span className="program-rail-num">{m.number}</span>
                <span className="program-rail-meta">
                  <span className="program-rail-day">{m.day}</span>
                  <span className="program-rail-title">{m.title}</span>
                </span>
                <span className="program-rail-bar" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="program-panel-section" ref={panelRef}>
        <div className="container">
          <div
            key={activeIndex}
            className={`program-panel ${visibleModule ? "is-in" : ""}`}
          >
            <div className="program-panel-header">
              <div className="program-panel-side">
                <div className="program-panel-num" aria-hidden="true">
                  {active.number}
                </div>
                <div className={`schedule-level ${active.badgeClass}`}>{active.badge}</div>
                <div className="program-panel-time">
                  <div className="program-panel-day">{active.day}</div>
                  <div>{active.time}</div>
                </div>
              </div>
              <div className="program-panel-main">
                <h2 className="program-panel-title">{active.title}</h2>
                <p className="program-panel-desc">{active.description}</p>
              </div>
            </div>

            <div className="program-tabs" role="tablist" aria-label="Module content">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "learn"}
                className={`program-tab ${tab === "learn" ? "is-active" : ""}`}
                onClick={() => setTab("learn")}
              >
                <span className="program-tab-num">01</span>
                <span>What you'll learn</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "build"}
                className={`program-tab ${tab === "build" ? "is-active" : ""}`}
                onClick={() => setTab("build")}
              >
                <span className="program-tab-num">02</span>
                <span>What you'll build</span>
              </button>
              <span className="program-tab-indicator" data-pos={tab} aria-hidden="true" />
            </div>

            <div className="program-list-wrapper">
              <ul className={`program-list ${visibleModule ? "is-in" : ""}`} key={tab}>
                {items.map((it, i) => (
                  <li
                    key={`${activeIndex}-${tab}-${i}`}
                    className="program-list-item"
                    style={{ animationDelay: `${i * 90}ms` }}
                  >
                    <span className="program-list-marker" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="program-led-by">
              <div className="program-led-avatar" aria-hidden="true">
                {active.speakerInitials}
              </div>
              <div>
                <div className="program-led-label">LED BY</div>
                <div className="program-led-name">
                  <Link
                    href={`/speakers#${active.speakerId}`}
                    style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1.5px solid var(--color-sienna)', paddingBottom: '1px', fontWeight: 700 }}
                  >
                    {active.speakerName}
                  </Link>
                  <span className="program-led-role">, {active.speakerRole}</span>
                </div>
              </div>
            </div>

            <div className="program-nav">
              <button
                type="button"
                className="program-nav-btn"
                onClick={() => handleSelect((activeIndex - 1 + MODULES.length) % MODULES.length)}
              >
                ← {MODULES[(activeIndex - 1 + MODULES.length) % MODULES.length].title}
              </button>
              <button
                type="button"
                className="program-nav-btn align-right"
                onClick={() => handleSelect((activeIndex + 1) % MODULES.length)}
              >
                {MODULES[(activeIndex + 1) % MODULES.length].title} →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section program-cta-section">
        <div className="container text-center">
          <h2 style={{ color: 'var(--color-white)', maxWidth: '720px', margin: '0 auto 1.25rem' }}>
            Two days. Four modules. One cohort that learns by doing.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
            Step in. Skill up. Ship real projects
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
            Register for the Program →
          </Link>
        </div>
      </section>
    </main>
  );
}
