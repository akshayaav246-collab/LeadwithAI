import { useEffect, useRef, useState, type ReactElement } from "react";

type Item = {
  title: string;
  body: string;
  icon: ReactElement;
};

const ITEMS: Item[] = [
  {
    title: "Confidence, not just curiosity",
    body: "Move past \"I've heard of it\" to \"I use it every day\", with the practical grounding to back that claim up.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    title: "Your AI work, ready to showcase",
    body: "From a personalised writing agent to a working product prototype, your two-day output is your new portfolio.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    title: "A learning upgrade you keep forever",
    body: "Not just what to learn, how to learn it, faster and better, using AI as your always-on research and revision partner",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: "You lead. The tool follows.",
    body: "The best AI users aren't tied to one platform, they know how to get results out of whichever one is in front of them.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 9.4 7.5 4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05" />
        <path d="M12 22.08V12" />
      </svg>
    ),
  },
  {
    title: "Use it well, not just often",
    body: "The goal isn't to use AI everywhere, it's to know exactly where it adds value and where your thinking must lead",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      </svg>
    ),
  },
  {
    title: "Earn your AI certificate",
    body: "Leave with official certification and a clear way to position your new skills on your resume, LinkedIn, and beyond.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </svg>
    ),
  },
];

export function SixThings() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const isCardClick = cardRefs.current.some(card => card?.contains(e.target as Node));
      if (!isCardClick) {
        setActiveIndex(null);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCardClick = (index: number) => {
    setActiveIndex((prev) => (prev === index ? null : index));
  };

  const handleDotClick = (index: number) => {
    setActiveIndex(index);
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  };

  const filledThrough = activeIndex !== null ? activeIndex : -1;

  return (
    <section
      ref={sectionRef}
      className={`six-things-section ${visible ? "is-visible" : ""}`}
    >
      <div className="six-things-inner">
        <div className="six-things-header">
          <div className="six-things-eyebrow">SIX THINGS YOU LEAVE WITH</div>
          <h2 className="six-things-title">
            Six things you will leave with that you did not have when you arrived
          </h2>

        </div>

        <div className="six-things-grid">
          {ITEMS.map((item, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`six-card ${activeIndex === i ? "is-active" : ""}`}
              style={{ animationDelay: `${i * 90}ms` }}
              onClick={() => handleCardClick(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(i);
                }
              }}
            >
              <span className="six-ghost-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="six-card-icon">{item.icon}</div>
              <h3 className="six-card-title">{item.title}</h3>
              <p className="six-card-body">{item.body}</p>
              <span className="six-card-underline" aria-hidden="true" />
              <span className="six-card-pulse" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
