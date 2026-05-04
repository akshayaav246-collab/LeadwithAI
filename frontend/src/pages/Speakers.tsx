import { useEffect, useRef, useState } from "react";

type Speaker = {
  initials: string;
  name: string;
  role: string;
  module: string;
  moduleLabel: string;
  bio: string;
  imageUrl?: string;
  linkedin: string;
  highlights: string[];
};

const SPEAKERS: Speaker[] = [
  {
    initials: "SK",
    name: "Sendhil Kumar S",
    role: "Founder & Chairman",
    module: "Module 1: Getting Started with Generative AI",
    moduleLabel: "MODULE 1 · GETTING STARTED WITH GENERATIVE AI",
    bio: "Sendhil has spent his career at the intersection of technology, learning, and entrepreneurship. As Founder and Chairman of Global Knowledge Technologies, he leads initiatives that help individuals and organisations move from passive AI awareness to active, responsible adoption.",
    imageUrl: "/Sendhil sir.jpg",
    linkedin: "https://www.linkedin.com/in/sendhil-kumar-a6aa13122/",
    highlights: [
      "Leads practical AI adoption with a strong focus on real-world applications",
      "Simplifies Generative AI concepts into clear, usable mental models",
      "Helps learners build strong foundations to use AI effectively from day one"
    ]
  },
  {
    initials: "RS",
    name: "Dr. Radhika S",
    role: "VP Technical",
    module: "Module 2: Building Personalised AI Agents",
    moduleLabel: "MODULE 2 · BUILDING PERSONALISED AI AGENTS",
    bio: "Dr. Radhika is a distinguished computer science academic and research leader holding MCA, ME, M.Phil., and a Ph.D. As VP Technical at GKT, she bridges research-grade thinking with practical product education for participants from any background.",
    imageUrl: "/radhika mam.jpg",
    linkedin: "https://www.linkedin.com/in/dr-s-radhika-pandiyan-8b263116/",
    highlights: [
      "Expert in AI research with deep knowledge in machine learning and neural networks",
      "Guides learners to build personalized AI agents tailored to real-world needs",
      "Strong academic mentor with extensive experience in student innovation"
    ]
  },
  {
    initials: "PD",
    name: "Peter Darius",
    role: "AI Technology Leader",
    module: "Module 3: Building Products Using AI",
    moduleLabel: "MODULE 3 · BUILDING PRODUCTS USING AI",
    bio: "Peter brings over two decades of technology training and hands-on AI leadership, spanning machine learning, deep learning, neural networks, NLP, computer vision, and large language models. His sessions are known for being rigorous and practical in equal measure.",
    imageUrl: "/peter sir.jpg",
    linkedin: "https://www.linkedin.com/in/pmdarius/",
    highlights: [
      "20+ years experience across AI, programming, and emerging technologies",
      "Specializes in turning ideas into working AI-powered products without heavy coding",
      "Strong advocate of hands-on learning and rapid prototyping"
    ]
  },
  {
    initials: "DT",
    name: "Dinesh T",
    role: "Chief Technology Officer",
    module: "Module 4: Visual Storytelling & Content Creation",
    moduleLabel: "MODULE 4 · VISUAL STORYTELLING & CONTENT CREATION",
    bio: "Dinesh operates at an unusual intersection: AI, storytelling, learning design, and strategic communication. As CTO at GKT, he leads digital programs and AI-led content initiatives with an editorial eye and a technologist's precision.",
    imageUrl: "/dinesh sir.jpg",
    linkedin: "https://www.linkedin.com/in/dineshthan/",
    highlights: [
      "Expert in AI-driven storytelling and digital communication strategies",
      "Helps translate ideas into compelling visual and brand-aligned content",
      "Focuses on ethical, impactful, and audience-driven content creation"
    ]
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
              {speaker.imageUrl ? (
                <img src={speaker.imageUrl} alt={speaker.name} className="speaker-img" />
              ) : (
                <div className="speaker-initials">{speaker.initials}</div>
              )}
            </div>
            <div className="speaker-module-tag">{speaker.moduleLabel}</div>
          </div>
          <div className="speaker-bio-col speaker-anim-bio">
            <div>
              <div className="speaker-role">{speaker.role.toUpperCase()}</div>
              <h2 className="speaker-name">{speaker.name}</h2>
              <h4 className="speaker-module">{speaker.module}</h4>
            </div>
            <div className="speaker-bio-content">
              <p className="speaker-bio-text">{speaker.bio}</p>
              <ul className="speaker-highlights">
                {speaker.highlights.map((highlight, idx) => (
                  <li key={idx}><span className="speaker-bullet">◆</span> {highlight}</li>
                ))}
              </ul>
              <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer" className="speaker-linkedin">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Connect on LinkedIn
              </a>
            </div>
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
          <div className="section-label" style={{ color: 'var(--color-sienna)', marginBottom: '1rem' }}>THE SPEAKERS</div>
          <h1 style={{ color: 'var(--color-white)', maxWidth: '800px', marginBottom: '1.5rem' }}>
            Meet the People Who Will Change How You Think About AI
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', maxWidth: '680px' }}>
            Every mentor in this program is an active practitioner, someone who uses AI not to talk about transformation, but to cause it.
          </p>
        </div>
      </section>

      {SPEAKERS.map((s, i) => (
        <SpeakerRow key={s.initials} speaker={s} index={i} />
      ))}
    </main>
  );
}
