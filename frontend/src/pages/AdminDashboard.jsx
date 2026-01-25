import { useState, useEffect } from 'react';
import { submissionApi, subscriptionApi } from '../services/api';
import PipelineCard from '../components/admin/PipelineCard';
import IntegrationStatus from '../components/admin/IntegrationStatus';
import './AdminDashboard.css';

function AdminDashboard() {
  const [activeProcessing, setActiveProcessing] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({
    processingCount: 0,
    storageUsed: '0 GB',
    activeSubscriptions: 0,
    completedToday: 0
  });
  const [integrationHealth, setIntegrationHealth] = useState({
    n8n: 'unknown',
    youtube: 'unknown',
    storage: 'unknown',
    email: 'unknown'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Load active processing jobs
      const processing = await submissionApi.getActiveProcessing();
      setActiveProcessing(processing);

      // Load dashboard stats
      const statsData = await submissionApi.getDashboardStats();
      setStats(statsData);

      // Load recent activity
      const activity = await submissionApi.getRecentActivity();
      setRecentActivity(activity);

      // Check integration health
      const health = await submissionApi.checkIntegrationHealth();
      setIntegrationHealth(health);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCancelProcessing = async (id) => {
    if (!confirm('Are you sure you want to cancel this processing job?')) {
      return;
    }

    try {
      await submissionApi.cancelProcessing(id);
      loadDashboardData();
    } catch (error) {
      console.error('Error canceling processing:', error);
      alert('Failed to cancel processing. Please try again.');
    }
  };

  const handleRetryProcessing = async (id) => {
    try {
      await submissionApi.retryProcessing(id);
      loadDashboardData();
    } catch (error) {
      console.error('Error retrying processing:', error);
      alert('Failed to retry processing. Please try again.');
    }
  };

  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'submission': return '📥';
      case 'complete': return '✅';
      case 'subscription': return '📬';
      case 'error': return '⚠️';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Mission Control</h1>
          <p className="dashboard-subtitle">Monitor sermon processing and system health</p>
        </div>
        <button onClick={() => loadDashboardData()} className="btn btn-secondary">
          🔄 Refresh
        </button>
      </header>

      <div className="dashboard-grid">
        {/* Quick Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon processing">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.processingCount}</div>
              <div className="stat-label">Processing</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon storage">💾</div>
            <div className="stat-content">
              <div className="stat-value">{stats.storageUsed}</div>
              <div className="stat-label">Storage Used</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon subscriptions">📺</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeSubscriptions}</div>
              <div className="stat-label">Active Subscriptions</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.completedToday}</div>
              <div className="stat-label">Completed Today</div>
            </div>
          </div>
        </div>

        {/* Active Pipeline */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Active Pipeline</h2>
            {activeProcessing.length > 0 && (
              <span className="count-badge">{activeProcessing.length}</span>
            )}
          </div>

          {activeProcessing.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✨</span>
              <p>No active processing jobs</p>
              <p className="empty-hint">New submissions will appear here</p>
            </div>
          ) : (
            <div className="pipeline-grid">
              {activeProcessing.map((job) => (
                <PipelineCard
                  key={job.id}
                  job={job}
                  onCancel={handleCancelProcessing}
                  onRetry={handleRetryProcessing}
                />
              ))}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>System Health</h2>
          </div>
          <IntegrationStatus health={integrationHealth} />
        </div>

        {/* Recent Activity */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div className="empty-state small">
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="activity-feed">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <span className="activity-time">{formatActivityTime(activity.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
