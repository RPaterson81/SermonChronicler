import { useState } from 'react';
import { submissionApi } from '../services/api';
import './Landing.css';

function Landing({ onSubmissionComplete }) {
  const [activeMode, setActiveMode] = useState('single'); // 'single' or 'subscription'
  const [formData, setFormData] = useState({
    url: '',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(null);
  };

  const validateYouTubeUrl = (url) => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/channel\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const validateEmail = (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.url || !formData.email) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateYouTubeUrl(formData.url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      if (activeMode === 'single') {
        await submissionApi.submitSingleVideo(formData);
        setSuccess('Video submitted for processing! You\'ll receive an email when materials are ready.');
      } else {
        await submissionApi.createSubscription(formData);
        setSuccess('Subscription created! You\'ll receive study materials for all new videos from this channel.');
      }

      // Reset form
      setFormData({ url: '', email: '' });

      // Navigate to appropriate view after short delay
      setTimeout(() => {
        if (onSubmissionComplete) {
          onSubmissionComplete(activeMode);
        }
      }, 2000);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo">
          <span className="logo-icon">📖</span>
          <h1>SermonChronicler</h1>
        </div>
        <p className="tagline">Preserving the Message. Deepening the Study.</p>
      </header>

      <div className="landing-content">
        <div className="submission-section">
          <div className="mode-selector">
            <button
              className={`mode-btn ${activeMode === 'single' ? 'active' : ''}`}
              onClick={() => setActiveMode('single')}
            >
              <span className="mode-icon">🎥</span>
              <span>Process Single Video</span>
            </button>
            <button
              className={`mode-btn ${activeMode === 'subscription' ? 'active' : ''}`}
              onClick={() => setActiveMode('subscription')}
            >
              <span className="mode-icon">📺</span>
              <span>Subscribe to Channel</span>
            </button>
          </div>

          <div className="submission-card">
            {activeMode === 'single' ? (
              <div className="mode-description">
                <h2>Process a Single Sermon</h2>
                <p>Enter a YouTube video URL to generate study materials for one sermon.</p>
                <ul className="benefits-list">
                  <li>✓ Sermon notes with structure and outline</li>
                  <li>✓ Keyword study with biblical references</li>
                  <li>✓ Life group leader's guide</li>
                  <li>✓ Member handout for group study</li>
                  <li>✓ Clean transcript</li>
                </ul>
              </div>
            ) : (
              <div className="mode-description">
                <h2>Subscribe to a Channel</h2>
                <p>Automatically process all new sermons from a YouTube channel.</p>
                <ul className="benefits-list">
                  <li>✓ Automatic processing of new videos</li>
                  <li>✓ Email notifications when materials are ready</li>
                  <li>✓ Build your sermon library automatically</li>
                  <li>✓ Never miss a sermon</li>
                  <li>✓ Manage preferences anytime</li>
                </ul>
              </div>
            )}

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleSubmit} className="submission-form">
              <div className="form-group">
                <label htmlFor="url">
                  {activeMode === 'single' ? 'YouTube Video URL' : 'YouTube Channel URL'}
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder={
                    activeMode === 'single'
                      ? 'https://youtube.com/watch?v=...'
                      : 'https://youtube.com/@yourchurch'
                  }
                  required
                  disabled={submitting}
                />
                <span className="field-hint">
                  {activeMode === 'single'
                    ? 'Paste the full URL of the sermon video'
                    : 'Paste the channel URL (e.g., @channelname or /channel/ID)'}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@church.org"
                  required
                  disabled={submitting}
                />
                <span className="field-hint">
                  {activeMode === 'single'
                    ? 'We\'ll email you when materials are ready'
                    : 'You\'ll receive notifications for each new video'}
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="loading"></span>
                    {activeMode === 'single' ? 'Submitting...' : 'Creating Subscription...'}
                  </>
                ) : (
                  <>
                    {activeMode === 'single' ? '🚀 Generate Study Materials' : '📬 Subscribe to Channel'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="how-it-works">
          <h3>How It Works</h3>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Submit</h4>
                <p>Enter a YouTube URL and your email address</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Process</h4>
                <p>AI analyzes the sermon and generates study materials</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Receive</h4>
                <p>Download materials and get them via email</p>
              </div>
            </div>
          </div>
        </div>

        <div className="recent-sermons">
          <h3>Recently Processed Sermons</h3>
          <div className="sermon-preview-grid">
            {/* This would be populated from API in real implementation */}
            <div className="sermon-preview-card">
              <div className="preview-thumbnail">
                <div className="thumbnail-placeholder">🎬</div>
              </div>
              <div className="preview-info">
                <h4>Sample Sermon Title</h4>
                <p className="preview-date">January 15, 2024</p>
                <p className="preview-speaker">Pastor John Doe</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <p>Powered by AI • Built for the Church</p>
        <div className="footer-links">
          <a href="#about">About</a>
          <a href="#privacy">Privacy</a>
          <a href="#contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
