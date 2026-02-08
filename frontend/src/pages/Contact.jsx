import { useState } from 'react';
import './InfoPages.css';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, just show success message
    // In production, this would send to an API endpoint or email service
    console.log('Contact form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="info-page">
      <div className="info-hero">
        <h1>Contact Us</h1>
        <p className="tagline">We'd love to hear from you</p>
      </div>

      <div className="info-content contact-content">
        <section className="info-section">
          <h2>Get in Touch</h2>
          <p>
            Have questions, suggestions, or feedback about SermonChronicler? We're here to 
            help. Whether you're experiencing technical issues, want to suggest new features, 
            or just want to share how SermonChronicler has helped your ministry, we'd love 
            to hear from you.
          </p>
        </section>

        <div className="contact-grid">
          <div className="contact-methods">
            <h3>Other Ways to Reach Us</h3>
            
            <div className="contact-method">
              <span className="contact-icon">💬</span>
              <div>
                <h4>General Inquiries</h4>
                <p>For questions about how SermonChronicler works or getting started</p>
              </div>
            </div>

            <div className="contact-method">
              <span className="contact-icon">🔧</span>
              <div>
                <h4>Technical Support</h4>
                <p>Experiencing issues? Let us know what's happening and we'll help resolve it</p>
              </div>
            </div>

            <div className="contact-method">
              <span className="contact-icon">💡</span>
              <div>
                <h4>Feature Requests</h4>
                <p>Have ideas for new features or improvements? We're listening!</p>
              </div>
            </div>

            <div className="contact-method">
              <span className="contact-icon">⛪</span>
              <div>
                <h4>Ministry Partnerships</h4>
                <p>Interested in partnering with us or integrating with your systems?</p>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            <h3>Send Us a Message</h3>
            
            {submitted && (
              <div className="success-message">
                ✓ Thank you for your message! We'll get back to you soon.
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What's this about?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Tell us more..."
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Send Message
              </button>
            </form>
          </div>
        </div>

        <section className="info-section faq-section">
          <h3>Frequently Asked Questions</h3>
          
          <div className="faq-item">
            <h4>What file formats do you accept?</h4>
            <p>
              Currently, we accept plain text (.txt) files. Make sure your transcript is in 
              UTF-8 encoding and doesn't exceed 10MB in size.
            </p>
          </div>

          <div className="faq-item">
            <h4>How long does processing take?</h4>
            <p>
              Most sermons are processed in 2-5 minutes. Longer transcripts may take up to 
              10 minutes. You can monitor progress in real-time on the processing history page.
            </p>
          </div>

          <div className="faq-item">
            <h4>Can I edit the generated materials?</h4>
            <p>
              Yes! All materials are delivered as editable text files (.txt) that you can 
              open in any word processor or text editor to customize for your needs.
            </p>
          </div>

          <div className="faq-item">
            <h4>Is SermonChronicler free to use?</h4>
            <p>
              SermonChronicler is currently free to use as we develop and refine the service. 
              We'll communicate any future pricing plans well in advance.
            </p>
          </div>

          <div className="faq-item">
            <h4>Can I use this for multiple churches?</h4>
            <p>
              Absolutely! You can process sermons from any speaker or church. Each submission 
              is independent and can be deleted individually.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Contact;
