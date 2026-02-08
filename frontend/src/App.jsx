import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import UploadForm from './components/UploadForm';
import SermonList from './components/SermonList';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import { sermonApi } from './services/api';
import './App.css';

function Navigation() {
  const location = useLocation();
  
  // Don't show navigation on admin dashboard
  if (location.pathname === '/admin') {
    return null;
  }
  
  return (
    <nav className="main-nav">
      <div className="container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">📖</span>
          SermonChronicler
        </Link>
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Home
          </Link>
          <Link 
            to="/upload" 
            className={location.pathname === '/upload' ? 'active' : ''}
          >
            Legacy Upload
          </Link>
          <Link 
            to="/about" 
            className={location.pathname === '/about' ? 'active' : ''}
          >
            About
          </Link>
          <Link 
            to="/privacy" 
            className={location.pathname === '/privacy' ? 'active' : ''}
          >
            Privacy
          </Link>
          <Link 
            to="/contact" 
            className={location.pathname === '/contact' ? 'active' : ''}
          >
            Contact
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const location = useLocation();
  
  // Don't show footer on admin dashboard
  if (location.pathname === '/admin') {
    return null;
  }
  
  return (
    <footer className="app-footer">
      <div className="container">
        <p>© 2024 SermonChronicler - Powered by AI</p>
        <div className="footer-links">
          <Link to="/about">About</Link>
          <span className="separator">•</span>
          <Link to="/privacy">Privacy</Link>
          <span className="separator">•</span>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

function LegacyApp() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    loadSermons();
    
    // Poll more frequently (3 seconds) when processing or viewing history
    const hasProcessing = sermons.some(s => s.status === 'processing');
    const interval = setInterval(() => {
      if (activeTab === 'history' || hasProcessing) {
        loadSermons(true);
      }
    }, 3000); // Changed from 5000 to 3000

    return () => clearInterval(interval);
  }, [activeTab, sermons]);

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
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/upload" element={<LegacyApp />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
