import { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import SermonList from './components/SermonList';
import { sermonApi } from './services/api';
import './App.css';

function App() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    loadSermons();
    
    // Poll for updates every 5 seconds when on history tab
    const interval = setInterval(() => {
      if (activeTab === 'history') {
        loadSermons(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const loadSermons = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await sermonApi.getAllSermons();
      setSermons(data);
      setError(null);
    } catch (err) {
      console.error('Error loading sermons:', err);
      if (!silent) {
        setError('Failed to load sermons. Please try again.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSermonSubmitted = () => {
    loadSermons();
    setActiveTab('history');
  };

  const handleDeleteSermon = async (id) => {
    if (!confirm('Are you sure you want to delete this sermon and all its files?')) {
      return;
    }

    try {
      await sermonApi.deleteSermon(id);
      loadSermons();
    } catch (err) {
      console.error('Error deleting sermon:', err);
      alert('Failed to delete sermon. Please try again.');
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="container">
          <h1>SermonChronicler</h1>
          <p>Transform sermon transcripts into engaging study materials</p>
        </div>
      </header>

      <div className="container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload New Sermon
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Processing History
            {sermons.filter(s => s.status === 'processing').length > 0 && (
              <span className="badge">
                {sermons.filter(s => s.status === 'processing').length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="tab-content">
          {activeTab === 'upload' && (
            <UploadForm onSermonSubmitted={handleSermonSubmitted} />
          )}

          {activeTab === 'history' && (
            <>
              {loading ? (
                <div className="loading-container">
                  <div className="loading"></div>
                  <p>Loading sermons...</p>
                </div>
              ) : (
                <SermonList 
                  sermons={sermons} 
                  onDelete={handleDeleteSermon}
                  onRefresh={() => loadSermons()}
                />
              )}
            </>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <div className="container">
          <p>© 2024 SermonChronicler - Powered by AI</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
