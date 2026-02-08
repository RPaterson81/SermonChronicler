import { useState, useEffect } from 'react';
import { submissionApi } from '../services/submission-api';
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
  const [recentSermons, setRecentSermons] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Load recent completed sermons
  useEffect(() => {
    loadRecentSermons();
    // Refresh every 30 seconds
    const interval = setInterval(loadRecentSermons, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRecentSermons = async () => {
    try {
      setLoadingRecent(true);
      const response = await fetch('https://api.sermonchronicler.com/api/submissions/active');
      const submissions = await response.json();
      
      // Get only completed submissions, sorted by most recent
      const completed = submissions
        .filter(s => s.status === 'complete')
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 6); // Show only 6 most recent
      
      setRecentSermons(completed);
    } catch (err) {
      console.error('Error loading recent sermons:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDownloadUrl = (submissionId, fileType) => {
    return `https://api.sermonchronicler.com/outputs/${submissionId}/${fileType}.txt`;
  };

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

      // Reload recent sermons to show the new submission
      setTimeout(() => {
        loadRecentSermons();
      }, 1000);

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
          {loadingRecent ? (
            <div className="loading-container">
              <div className="loading"></div>
              <p>Loading recent sermons...</p>
            </div>
          ) : recentSermons.length === 0 ? (
            <div className="empty-state">
              <p>No completed sermons yet. Be the first to submit one!</p>
            </div>
          ) : (
            <div className="sermon-preview-grid">
              {recentSermons.map((sermon) => (
                <div key={sermon.id} className="sermon-preview-card">
                  <div className="preview-thumbnail">
                    {sermon.metadata?.thumbnail ? (
                      <img src={sermon.metadata.thumbnail} alt={sermon.metadata.title} />
                    ) : (
                      <div className="thumbnail-placeholder">🎬</div>
                    )}
                    <div className="completion-badge">
                      <span className="badge-icon">✓</span>
                      <span className="badge-text">Complete</span>
                    </div>
                  </div>
                  <div className="preview-info">
                    <h4>{sermon.metadata?.title || 'Untitled Sermon'}</h4>
                    <p className="preview-date">{formatDate(sermon.completedAt)}</p>
                    {sermon.metadata?.channelTitle && (
                      <p className="preview-speaker">{sermon.metadata.channelTitle}</p>
                    )}
                    
                    {/* Progress indicators */}
                    <div className="files-ready">
                      {sermon.filesReady.cleanTranscript && <span className="file-dot ready" title="Clean Transcript">●</span>}
                      {sermon.filesReady.notes && <span className="file-dot ready" title="Sermon Notes">●</span>}
                      {sermon.filesReady.keywordStudy && <span className="file-dot ready" title="Keyword Study">●</span>}
                      {sermon.filesReady.leadersGuide && <span className="file-dot ready" title="Leaders Guide">●</span>}
                      {sermon.filesReady.membersHandout && <span className="file-dot ready" title="Members Handout">●</span>}
                    </div>

                    {/* Download buttons */}
                    <div className="preview-actions">
                      <div className="download-dropdown">
                        <button className="btn-download">
                          📥 Download Materials
                        </button>
                        <div className="download-menu">
                          {sermon.filesReady.cleanTranscript && (
                            <a 
                              href={getDownloadUrl(sermon.id, 'clean-transcript')}
                              download
                              className="download-link"
                            >
                              📄 Clean Transcript
                            </a>
                          )}
                          {sermon.filesReady.notes && (
                            <a 
                              href={getDownloadUrl(sermon.id, 'notes')}
                              download
                              className="download-link"
                            >
                              📝 Sermon Notes
                            </a>
                          )}
                          {sermon.filesReady.keywordStudy && (
                            <a 
                              href={getDownloadUrl(sermon.id, 'keyword-study')}
                              download
                              className="download-link"
                            >
                              🔍 Keyword Study
                            </a>
                          )}
                          {sermon.filesReady.leadersGuide && (
                            <a 
                              href={getDownloadUrl(sermon.id, 'leaders-guide')}
                              download
                              className="download-link"
                            >
                              👥 Leaders Guide
                            </a>
                          )}
                          {sermon.filesReady.membersHandout && (
                            <a 
                              href={getDownloadUrl(sermon.id, 'members-handout')}
                              download
                              className="download-link"
                            >
                              📋 Members Handout
                            </a>
                          )}
                        </div>
                      </div>
                      <a 
                        href={sermon.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-watch"
                      >
                        ▶️ Watch
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
