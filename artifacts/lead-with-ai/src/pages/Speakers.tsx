import { Link } from "wouter";

export function Speakers() {
  return (
    <main>
      <section className="page-header">
        <div className="container">
          <div className="breadcrumb">Home / Speakers</div>
          <h1 style={{ color: 'var(--color-white)', maxWidth: '800px', marginBottom: '1.5rem' }}>
            Meet the People Who Will Change How You Think About AI
          </h1>
          <p style={{ color: 'var(--color-stone)', maxWidth: '680px' }}>
            Every mentor in this program is an active practitioner — someone who uses AI not to talk about transformation, but to cause it. They bring decades of combined experience across enterprise technology, machine learning, computer science research, and creative leadership. What they share comes directly from what they are building, researching, and deploying right now.
          </p>
        </div>
      </section>

      {/* Speaker 1 */}
      <section className="section" style={{ background: 'var(--color-cream)' }}>
        <div className="container">
          <div className="speaker-card">
            <div className="speaker-photo-col">
              <div className="speaker-photo" aria-label="Sendhil Kumar S">
                <div className="speaker-initials">SK</div>
              </div>
              <div style={{ display: 'inline-block', background: 'var(--color-parchment)', border: '1px solid var(--color-sand)', color: 'var(--color-sienna)', fontSize: '0.8rem', letterSpacing: '0.1em', padding: '0.4rem 1rem', borderRadius: '2px' }}>
                MODULE 1 · GETTING STARTED WITH GENERATIVE AI
              </div>
            </div>
            <div className="speaker-bio-col">
              <div className="speaker-role">FOUNDER & CHAIRMAN</div>
              <h2>Sendhil Kumar S</h2>
              <h4 style={{ color: 'var(--color-umber)', marginBottom: '1.5rem' }}>Module 1 — Getting Started with Generative AI</h4>
              
              <p style={{ color: 'var(--color-umber)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                Sendhil has spent his career at the intersection of technology, learning, and entrepreneurship. As Founder and Chairman of Global Knowledge Technologies, he leads initiatives that help individuals and organisations move from passive AI awareness to active, responsible adoption. His work focuses on closing the gap between what AI can do and what most people actually know how to do with it — making lifelong learning practical in an era where the rules keep changing.
              </p>

              <h4 style={{ color: 'var(--color-espresso)', marginBottom: '0.5rem' }}>What he brings to this session</h4>
              <p style={{ color: 'var(--color-ink)' }}>
                Sendhil opens the program with a session built to give participants a clear, honest mental model of generative AI — what it is, where it is heading, and how to engage with it without being overwhelmed. Expect a fast-moving, myth-busting conversation grounded in real-world examples, not vendor talking points.
              </p>

              <div className="expertise-chips">
                <div className="expertise-chip">AI Adoption Strategy</div>
                <div className="expertise-chip">Learning Design</div>
                <div className="expertise-chip">Business Transformation</div>
                <div className="expertise-chip">Entrepreneurship</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Speaker 2 */}
      <section className="section" style={{ background: 'var(--color-parchment)' }}>
        <div className="container">
          <div className="speaker-card reverse">
            <div className="speaker-photo-col">
              <div className="speaker-photo" aria-label="Peter Darius">
                <div className="speaker-initials">PD</div>
              </div>
              <div style={{ display: 'inline-block', background: 'var(--color-cream)', border: '1px solid var(--color-sand)', color: 'var(--color-sienna)', fontSize: '0.8rem', letterSpacing: '0.1em', padding: '0.4rem 1rem', borderRadius: '2px' }}>
                MODULE 2 · BUILDING PERSONALISED AI AGENTS
              </div>
            </div>
            <div className="speaker-bio-col">
              <div className="speaker-role">AI TECHNOLOGY LEADER</div>
              <h2>Peter Darius</h2>
              <h4 style={{ color: 'var(--color-umber)', marginBottom: '1.5rem' }}>Module 2 — Building Personalised AI Agents</h4>
              
              <p style={{ color: 'var(--color-umber)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                Peter brings over two decades of technology training and hands-on AI leadership to the program. He has guided learners across Java, C++, blockchain, MuleSoft, and a wide range of modern AI disciplines — including machine learning, deep learning, neural networks, natural language processing, computer vision, and large language models. His sessions are known for being rigorous and practical in equal measure: participants leave understanding not just what tools do, but how to make them work reliably in real contexts.
              </p>

              <h4 style={{ color: 'var(--color-espresso)', marginBottom: '0.5rem' }}>What he brings to this session</h4>
              <p style={{ color: 'var(--color-ink)' }}>
                Peter leads the module on building personalised AI agents — guiding participants through creating writing bots, designing agentic workflows, and understanding what separates a useful AI agent from one that sounds good but fails in practice. His background in deep learning and natural language processing gives this session a technical depth that is rare in workshop settings aimed at non-engineers.
              </p>

              <div className="expertise-chips">
                <div className="expertise-chip">Machine Learning</div>
                <div className="expertise-chip">Deep Learning</div>
                <div className="expertise-chip">NLP & LLMs</div>
                <div className="expertise-chip">AI Agent Design</div>
                <div className="expertise-chip">Computer Vision</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Speaker 3 */}
      <section className="section" style={{ background: 'var(--color-white)' }}>
        <div className="container">
          <div className="speaker-card">
            <div className="speaker-photo-col">
              <div className="speaker-photo" aria-label="Dr. Radhika S">
                <div className="speaker-initials">RS</div>
              </div>
              <div style={{ display: 'inline-block', background: 'var(--color-parchment)', border: '1px solid var(--color-sand)', color: 'var(--color-sienna)', fontSize: '0.8rem', letterSpacing: '0.1em', padding: '0.4rem 1rem', borderRadius: '2px' }}>
                MODULE 3 · BUILDING PRODUCTS USING AI
              </div>
            </div>
            <div className="speaker-bio-col">
              <div className="speaker-role">VP TECHNICAL</div>
              <h2>Dr. Radhika S</h2>
              <h4 style={{ color: 'var(--color-umber)', marginBottom: '1.5rem' }}>Module 3 — Building Products Using AI</h4>
              
              <p style={{ color: 'var(--color-umber)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                Dr. Radhika is a distinguished computer science academic and research leader with qualifications spanning MCA, ME, M.Phil., and a Ph.D. Her research interests include neural networks, image processing, data analysis, and machine learning — areas where she has guided numerous student projects and earned multiple academic recognitions. As VP Technical at GKT, she bridges research-grade thinking with practical product education, helping participants understand how AI-assisted tools actually behave under the hood.
              </p>

              <h4 style={{ color: 'var(--color-espresso)', marginBottom: '0.5rem' }}>What she brings to this session</h4>
              <p style={{ color: 'var(--color-ink)' }}>
                Dr. Radhika leads the vibe coding and product prototyping module — translating complex technical concepts into approachable, actionable steps that participants with no engineering background can follow and apply immediately. Her teaching style is precise, patient, and deeply structured, making the most technically demanding content genuinely accessible.
              </p>

              <div className="expertise-chips">
                <div className="expertise-chip">Neural Networks</div>
                <div className="expertise-chip">Image Processing</div>
                <div className="expertise-chip">Data Analysis</div>
                <div className="expertise-chip">AI-Assisted Product Development</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Speaker 4 */}
      <section className="section" style={{ background: 'var(--color-parchment)' }}>
        <div className="container">
          <div className="speaker-card reverse">
            <div className="speaker-photo-col">
              <div className="speaker-photo" aria-label="Dinesh T">
                <div className="speaker-initials">DT</div>
              </div>
              <div style={{ display: 'inline-block', background: 'var(--color-cream)', border: '1px solid var(--color-sand)', color: 'var(--color-sienna)', fontSize: '0.8rem', letterSpacing: '0.1em', padding: '0.4rem 1rem', borderRadius: '2px' }}>
                MODULE 4 · VISUAL STORYTELLING & CONTENT CREATION
              </div>
            </div>
            <div className="speaker-bio-col">
              <div className="speaker-role">CHIEF TECHNOLOGY OFFICER</div>
              <h2>Dinesh T</h2>
              <h4 style={{ color: 'var(--color-umber)', marginBottom: '1.5rem' }}>Module 4 — Visual Storytelling & Content Creation</h4>
              
              <p style={{ color: 'var(--color-umber)', fontSize: '1.1rem', marginBottom: '2rem' }}>
                Dinesh operates at an unusual intersection: AI, storytelling, learning design, and strategic communication. As Chief Technology Officer at GKT, he leads the organisation's digital programs and AI-led content initiatives. His particular strength is translation — taking complex technological ideas and making them land with force in campaigns, learning materials, and public narratives. He has built teams that work across technology, creativity, and execution simultaneously.
              </p>

              <h4 style={{ color: 'var(--color-espresso)', marginBottom: '0.5rem' }}>What he brings to this session</h4>
              <p style={{ color: 'var(--color-ink)' }}>
                Dinesh closes the program with the visual storytelling module — showing participants how to use AI not just to generate content, but to communicate ideas that actually stick. He brings an editorial eye and a technologist's precision to image prompting, video scripting, and creative asset development, with a strong emphasis on brand integrity and responsible publishing practices.
              </p>

              <div className="expertise-chips">
                <div className="expertise-chip">AI Content Creation</div>
                <div className="expertise-chip">Visual Storytelling</div>
                <div className="expertise-chip">Strategic Communication</div>
                <div className="expertise-chip">Digital Learning Design</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section text-center" style={{ background: 'var(--color-espresso)' }}>
        <div className="container">
          <h2 style={{ color: 'var(--color-white)', maxWidth: '800px', margin: '0 auto 1.5rem' }}>
            Four days in the room with this team is a head start most people do not get.
          </h2>
          <p style={{ color: 'var(--color-stone)', maxWidth: '520px', margin: '0 auto 2.5rem' }}>
            Do not attend to observe. Attend to build — and leave with the confidence to keep going.
          </p>
          <Link href="/register" className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
            Register for the Program →
          </Link>
        </div>
      </section>
    </main>
  );
}
