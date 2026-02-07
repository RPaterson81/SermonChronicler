import './InfoPages.css';

function Privacy() {
  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>Privacy Policy</h1>
        <p className="tagline">Your data, your control</p>
      </div>

      <div className="info-content">
        <section className="info-section">
          <h2>Our Commitment</h2>
          <p>
            SermonChronicler is committed to protecting your privacy and handling your data 
            with care and respect. This policy explains what information we collect, how we 
            use it, and your rights regarding your data.
          </p>
        </section>

        <section className="info-section">
          <h2>Information We Collect</h2>
          <div className="privacy-item">
            <h3>Sermon Transcripts</h3>
            <p>
              When you upload a sermon transcript, we temporarily store the file to process 
              it through our AI workflow. The transcript content is used solely to generate 
              your requested study materials.
            </p>
          </div>
          <div className="privacy-item">
            <h3>Metadata</h3>
            <p>
              We collect basic information you provide, including speaker names, sermon dates, 
              and submission timestamps. This helps organize your materials and maintain 
              processing history.
            </p>
          </div>
          <div className="privacy-item">
            <h3>Technical Data</h3>
            <p>
              We may collect standard technical information such as IP addresses, browser type, 
              and usage patterns to maintain system security and improve our services.
            </p>
          </div>
        </section>

        <section className="info-section">
          <h2>How We Use Your Information</h2>
          <ul className="privacy-list">
            <li>Process your sermon transcripts to generate study materials</li>
            <li>Maintain a history of your processed sermons for your reference</li>
            <li>Improve our AI processing algorithms and output quality</li>
            <li>Ensure system security and prevent abuse</li>
            <li>Communicate with you about service updates (if you provide contact information)</li>
          </ul>
        </section>

        <section className="info-section">
          <h2>Data Sharing</h2>
          <p>
            We do not sell, rent, or share your sermon content or personal information with 
            third parties, except:
          </p>
          <ul className="privacy-list">
            <li>
              <strong>AI Processing:</strong> Transcripts are processed through Google's Gemini AI 
              service under their terms of service and privacy policy
            </li>
            <li>
              <strong>Legal Requirements:</strong> If required by law or to protect our rights 
              and safety
            </li>
          </ul>
        </section>

        <section className="info-section">
          <h2>Data Retention</h2>
          <p>
            Your uploaded transcripts and generated materials are stored on our servers. You 
            can delete any sermon and its associated files at any time through the processing 
            history interface. Deleted items are permanently removed from our systems.
          </p>
          <p>
            We may retain anonymized usage statistics and aggregated data for service 
            improvement purposes.
          </p>
        </section>

        <section className="info-section">
          <h2>Data Security</h2>
          <p>
            We implement reasonable security measures to protect your data from unauthorized 
            access, disclosure, alteration, or destruction. However, no internet transmission 
            is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="info-section">
          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="privacy-list">
            <li>Access the sermons and materials you've submitted</li>
            <li>Delete your sermons and associated data at any time</li>
            <li>Request information about how your data is used</li>
            <li>Opt out of any future communications (if applicable)</li>
          </ul>
        </section>

        <section className="info-section">
          <h2>Children's Privacy</h2>
          <p>
            SermonChronicler is not directed to children under 13, and we do not knowingly 
            collect information from children under 13. If we become aware that we have 
            collected such information, we will take steps to delete it.
          </p>
        </section>

        <section className="info-section">
          <h2>Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Any changes will be posted 
            on this page with an updated effective date. Continued use of SermonChronicler 
            after changes constitutes acceptance of the updated policy.
          </p>
          <p className="effective-date">
            <strong>Effective Date:</strong> February 7, 2026
          </p>
        </section>

        <section className="info-section">
          <h2>Questions?</h2>
          <p>
            If you have questions about this privacy policy or how we handle your data, 
            please contact us through our <a href="/contact">contact page</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

export default Privacy;
