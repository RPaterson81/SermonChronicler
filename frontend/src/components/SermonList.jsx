import { sermonApi } from '../services/api';
import './SermonList.css';

function SermonList({ sermons, onDelete, onRefresh }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    return `status-badge status-${status}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return '⏳ Pending';
      case 'processing': return '🔵 Processing';
      case 'complete': return '✅ Complete';
      case 'failed': return '❌ Failed';
      default: return status;
    }
  };

  const fileTypeLabels = {
    cleanTranscript: 'Clean Transcript',
    notes: 'Sermon Notes',
    keywordStudy: 'Keyword Study',
    leadersGuide: 'Leaders Guide',
    membersHandout: 'Members Handout'
  };

  if (sermons.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📚</span>
        <h3>No sermons yet</h3>
        <p>Upload your first sermon transcript to get started</p>
      </div>
    );
  }

  return (
    <div className="sermon-list">
      <div className="list-header">
        <h2>Processing History</h2>
        <button onClick={onRefresh} className="btn btn-secondary btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {sermons.map((sermon) => (
        <div key={sermon.id} className="sermon-card card">
          <div className="sermon-header">
            <div className="sermon-info">
              <h3>{sermon.sermonName}</h3>
              <div className="sermon-meta">
                <span>Submitted: {formatTimestamp(sermon.submittedAt)}</span>
                {sermon.completedAt && (
                  <span>Completed: {formatTimestamp(sermon.completedAt)}</span>
                )}
              </div>
            </div>
            <span className={getStatusClass(sermon.status)}>
              {getStatusLabel(sermon.status)}
            </span>
          </div>

          {sermon.status === 'processing' && (
            <div className="files-progress">
              <h4>Files Progress:</h4>
              <div className="file-status-grid">
                {Object.entries(sermon.filesReady).map(([fileType, ready]) => (
                  <div key={fileType} className="file-status-item">
                    <span className={`file-indicator ${ready ? 'ready' : 'pending'}`}>
                      {ready ? '✓' : '○'}
                    </span>
                    <span className="file-label">{fileTypeLabels[fileType]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sermon.status === 'complete' && (
            <div className="files-section">
              <h4>Download Files:</h4>
              <div className="file-downloads">
                {Object.entries(sermon.filesReady).map(([fileType, ready]) => (
                  ready && (
                    <a
                      key={fileType}
                      href={sermonApi.getFileDownloadUrl(sermon.id, fileType)}
                      className="file-download-link"
                      download
                    >
                      📄 {fileTypeLabels[fileType]}
                    </a>
                  )
                ))}
              </div>
              <div className="bulk-actions">
                <a
                  href={sermonApi.getZipDownloadUrl(sermon.id)}
                  className="btn btn-primary"
                  download
                >
                  📦 Download All (ZIP)
                </a>
              </div>
            </div>
          )}

          {sermon.status === 'failed' && (
            <div className="error-section">
              <p>⚠️ Processing failed. Please try uploading again or contact support.</p>
            </div>
          )}

          <div className="sermon-actions">
            <button
              onClick={() => onDelete(sermon.id)}
              className="btn btn-danger btn-delete"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SermonList;
