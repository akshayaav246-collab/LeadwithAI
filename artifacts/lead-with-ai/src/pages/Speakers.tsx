import { useEffect, useRef, useState } from "react";

type Speaker = {
  initials: string;
  name: string;
  role: string;
  module: string;
  moduleLabel: string;
  bio: string;
};

const SPEAKERS: Speaker[] = [
  {
    initials: "SK",
    name: "Sendhil Kumar S",
    role: "Founder & Chairman",
    module: "Module 1 — Getting Started with Generative AI",
    moduleLabel: "MODULE 1 · GETTING STARTED WITH GENERATIVE AI",
    bio: "Sendhil has spent his career at the intersection of technology, learning, and entrepreneurship. As Founder and Chairman of Global Knowledge Technologies, he leads initiatives that help individuals and organisations move from passive AI awareness to active, responsible adoption.",
  },
  {
    initials: "PD",
    name: "Peter Darius",
    role: "AI Technology Leader",
    module: "Module 2 — Building Personalised AI Agents",
    moduleLabel: "MODULE 2 · BUILDING PERSONALISED AI AGENTS",
    bio: "Peter brings over two decades of technology training and hands-on AI leadership — spanning machine learning, deep learning, neural networks, NLP, computer vision, and large language models. His sessions are known for being rigorous and practical in equal measure.",
  },
  {
    initials: "RS",
    name: "Dr. Radhika S",
    role: "VP Technical",
    module: "Module 3 — Building Products Using AI",
    moduleLabel: "MODULE 3 · BUILDING PRODUCTS USING AI",
    bio: "Dr. Radhika is a distinguished computer science academic and research leader holding MCA, ME, M.Phil., and a Ph.D. As VP Technical at GKT, she bridges research-grade thinking with practical product education for participants from any background.",
  },
  {
    initials: "DT",
    name: "Dinesh T",
    role: "Chief Technology Officer",
    module: "Module 4 — Visual Storytelling & Content Creation",
    moduleLabel: "MODULE 4 · VISUAL STORYTELLING & CONTENT CREATION",
    bio: "Dinesh operates at an unusual intersection: AI, storytelling, learning design, and strategic communication. As CTO at GKT, he leads digital programs and AI-led content initiatives with an editorial eye and a technologist's precision.",
  },
];

function SpeakerRow({ speaker, index }: { speaker: Speaker; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const reverse = index % 2 === 1;

  return (
    <section
      ref={ref}
      className={`speaker-row ${reverse ? "is-reverse" : ""} ${visible ? "is-visible" : ""}`}
    >
      <div className="container">
        <div className={`speaker-card ${reverse ? "reverse" : ""}`}>
          <div className="speaker-photo-col speaker-anim-photo">
            <div className="speaker-photo" aria-label={speaker.name}>
              <div className="speaker-initials">{speaker.initials}</div>
            </div>
            <div className="speaker-module-tag">{speaker.moduleLabel}</div>
          </div>
          <div className="speaker-bio-col speaker-anim-bio">
            <div>
              <div className="speaker-role">{speaker.role.toUpperCase()}</div>
              <h2 className="speaker-name">{speaker.name}</h2>
              <h4 className="speaker-module">{speaker.module}</h4>
            </div>
            <p className="speaker-bio-text">{speaker.bio}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Speakers() {
  return (
    <main>
      <section className="page-header">
        <div className="container">
          <h1 style={{ color: 'var(--color-white)', maxWidth: '800px', marginBottom: '1.5rem' }}>
            Meet the People Who Will Change How You Think About AI
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', maxWidth: '680px' }}>
            Every mentor in this program is an active practitioner — someone who uses AI not to talk about transformation, but to cause it.
          </p>
        </div>
      </section>

      {SPEAKERS.map((s, i) => (
        <SpeakerRow key={s.initials} speaker={s} index={i} />
      ))}
    </main>
  );
}
