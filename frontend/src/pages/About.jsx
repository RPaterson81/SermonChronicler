import './InfoPages.css';

function About() {
  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>About SermonChronicler</h1>
        <p className="tagline">Preserving the Message. Deepening the Study.</p>
      </div>

      <div className="info-content">
        <section className="info-section">
          <h2>Our Mission</h2>
          <p>
            SermonChronicler bridges the gap between hearing a sermon and truly studying it. 
            Acting as a modern-day "ready writer," we transform raw sermon transcripts into 
            high-value spiritual resources that enable deeper engagement with God's Word.
          </p>
        </section>

        <section className="info-section">
          <h2>What We Do</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <span className="feature-icon">📝</span>
              <h3>Transcript Cleansing</h3>
              <p>
                Converts raw, conversational speech into readable, grammatically correct prose 
                without losing the speaker's authentic voice.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">📋</span>
              <h3>Structural Note-Taking</h3>
              <p>
                Automatically generates organized outlines, key takeaways, and sermon summaries 
                for easy reference and review.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🔍</span>
              <h3>Theological Analysis</h3>
              <p>
                Performs deep-dive keyword studies, linking vernacular terms to their biblical 
                Hebrew or Greek roots with scriptural context.
              </p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">👥</span>
              <h3>Life Group Resources</h3>
              <p>
                Creates tailored study materials for both leaders and members, facilitating 
                meaningful small group discussions.
              </p>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h2>Who We Serve</h2>
          <ul className="serve-list">
            <li>
              <strong>Churches</strong> building comprehensive sermon archives and digital libraries
            </li>
            <li>
              <strong>Life Group Leaders</strong> seeking quality discussion materials and study guides
            </li>
            <li>
              <strong>Individual Believers</strong> pursuing deeper Berean-style study of the Word
            </li>
            <li>
              <strong>Ministry Teams</strong> looking to maximize the impact of their teaching ministry
            </li>
          </ul>
        </section>

        <section className="info-section">
          <h2>The Technology</h2>
          <p>
            SermonChronicler leverages advanced AI technology (Google Gemini) combined with 
            thoughtful prompting and theological understanding to produce materials that honor 
            both the original message and the biblical text. Our automated workflow processes 
            transcripts through multiple specialized stages, each optimized for its specific output.
          </p>
        </section>

        <section className="info-section">
          <h2>Our Vision</h2>
          <p>
            We believe that every sermon contains truth worth preserving and studying deeply. 
            By removing the technical barriers to creating quality study materials, we enable 
            churches and individuals to steward their teaching ministry more effectively and 
            help believers engage more meaningfully with God's Word.
          </p>
        </section>
      </div>
    </div>
  );
}

export default About;
