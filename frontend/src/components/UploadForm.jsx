import { useState } from 'react';
import { sermonApi } from '../services/api';
import './UploadForm.css';

function UploadForm({ onSermonSubmitted }) {
  const [formData, setFormData] = useState({
    speaker: '',
    date: '',
    transcript: null
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFormData({ ...formData, transcript: file });
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formData.speaker || !formData.date || !formData.transcript) {
      setError('Please fill in all fields');
      return;
    }

    setUploading(true);

    try {
      const submitData = new FormData();
      submitData.append('speaker', formData.speaker);
      submitData.append('date', formData.date);
      submitData.append('transcript', formData.transcript);

      await sermonApi.submitSermon(submitData);
      
      setSuccess(true);
      setFormData({ speaker: '', date: '', transcript: null });
      
      setTimeout(() => {
        onSermonSubmitted();
      }, 1500);
    } catch (err) {
      console.error('Error submitting sermon:', err);
      setError(err.response?.data?.error || 'Failed to submit sermon. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="upload-form-container">
      <div className="card">
        <h2>Upload Sermon Transcript</h2>
        <p className="subtitle">Submit a sermon transcript to generate study materials</p>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">
            ✓ Sermon submitted successfully! Redirecting to history...
          </div>
        )}

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="speaker">Speaker Name(s) *</label>
            <input
              type="text"
              id="speaker"
              name="speaker"
              value={formData.speaker}
              onChange={handleInputChange}
              placeholder="e.g., John Doe or John Doe & Jane Smith"
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Sermon Date *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              max={getTodayDate()}
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Transcript File *</label>
            <div
              className={`dropzone ${dragActive ? 'active' : ''} ${formData.transcript ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.transcript ? (
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div>
                    <p className="file-name">{formData.transcript.name}</p>
                    <p className="file-size">
                      {(formData.transcript.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => setFormData({ ...formData, transcript: null })}
                    disabled={uploading}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="upload-icon">📁</span>
                  <p>Drag and drop your transcript file here</p>
                  <p className="or-text">or</p>
                  <label htmlFor="file-input" className="file-input-label">
                    Browse Files
                  </label>
                  <input
                    type="file"
                    id="file-input"
                    accept=".txt,text/plain"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  <p className="file-requirements">Only .txt files up to 10MB</p>
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={uploading || !formData.speaker || !formData.date || !formData.transcript}
          >
            {uploading ? (
              <>
                <span className="loading"></span>
                Processing...
              </>
            ) : (
              'Submit for Processing'
            )}
          </button>
        </form>
      </div>

      <div className="card info-card">
        <h3>What happens next?</h3>
        <ol className="process-list">
          <li>Your transcript will be processed by AI</li>
          <li>Five study materials will be generated:
            <ul>
              <li>Clean Transcript</li>
              <li>Sermon Notes</li>
              <li>Keyword Study</li>
              <li>Life Group Leaders Guide</li>
              <li>Life Group Members Handout</li>
            </ul>
          </li>
          <li>Processing typically takes 2-5 minutes</li>
          <li>You'll be able to download files as they complete</li>
        </ol>
      </div>
    </div>
  );
}

export default UploadForm;
