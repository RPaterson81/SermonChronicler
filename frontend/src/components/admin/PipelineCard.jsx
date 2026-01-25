import './PipelineCard.css';

function PipelineCard({ job, onCancel, onRetry }) {
  const getProgressPercentage = (job) => {
    const filesReady = Object.values(job.filesReady || {}).filter(Boolean).length;
    const totalFiles = 5; // Always 5 files
    return Math.round((filesReady / totalFiles) * 100);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔵';
      case 'complete': return '✅';
      case 'failed': return '❌';
      default: return '•';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'complete': return 'status-complete';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  const progress = getProgressPercentage(job);

  return (
    <div className={`pipeline-card ${getStatusClass(job.status)}`}>
      <div className="pipeline-thumbnail">
        {job.metadata?.thumbnail ? (
          <img src={job.metadata.thumbnail} alt={job.metadata.title} />
        ) : (
          <div className="thumbnail-placeholder">🎬</div>
        )}
        <div className="status-overlay">
          <span className="status-icon">{getStatusIcon(job.status)}</span>
        </div>
      </div>

      <div className="pipeline-content">
        <h3 className="pipeline-title" title={job.metadata?.title || 'Processing...'}>
          {job.metadata?.title || 'Processing...'}
        </h3>

        <div className="pipeline-meta">
          <span className="meta-item">
            📧 {job.email.substring(0, 20)}...
          </span>
          <span className="meta-item">
            ⏱️ {new Date(job.submittedAt).toLocaleTimeString()}
          </span>
        </div>

        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>

        <div className="file-status-mini">
          {Object.entries(job.filesReady || {}).map(([type, ready]) => (
            <span 
              key={type} 
              className={`file-dot ${ready ? 'ready' : 'pending'}`}
              title={type}
            />
          ))}
        </div>

        {job.status === 'failed' && (
          <div className="error-banner">
            ⚠️ Processing failed
          </div>
        )}

        <div className="pipeline-actions">
          {job.status === 'processing' && (
            <button 
              onClick={() => onCancel(job.id)} 
              className="btn-mini btn-secondary"
            >
              Cancel
            </button>
          )}
          {job.status === 'failed' && (
            <button 
              onClick={() => onRetry(job.id)} 
              className="btn-mini btn-primary"
            >
              Retry
            </button>
          )}
          {job.status === 'complete' && (
            <a 
              href={`/sermons/${job.id}`} 
              className="btn-mini btn-primary"
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default PipelineCard;
