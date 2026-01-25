import './IntegrationStatus.css';

function IntegrationStatus({ health }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'degraded': return '#ff9800';
      case 'down': return '#dc3545';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '●';
      case 'degraded': return '◐';
      case 'down': return '○';
      default: return '◯';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy': return 'Connected';
      case 'degraded': return 'Degraded';
      case 'down': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const integrations = [
    {
      name: 'n8n Workflow',
      key: 'n8n',
      description: 'Processing automation engine'
    },
    {
      name: 'YouTube API',
      key: 'youtube',
      description: 'Video metadata and transcripts'
    },
    {
      name: 'Storage',
      key: 'storage',
      description: 'File system and outputs'
    },
    {
      name: 'Email Service',
      key: 'email',
      description: 'Notification delivery'
    }
  ];

  const getOverallHealth = () => {
    const statuses = Object.values(health);
    if (statuses.every(s => s === 'healthy')) return 'healthy';
    if (statuses.some(s => s === 'down')) return 'critical';
    if (statuses.some(s => s === 'degraded')) return 'warning';
    return 'unknown';
  };

  const overallHealth = getOverallHealth();

  return (
    <div className="integration-status">
      <div className={`overall-health health-${overallHealth}`}>
        <span className="health-indicator">
          {getStatusIcon(overallHealth === 'critical' ? 'down' : overallHealth === 'warning' ? 'degraded' : 'healthy')}
        </span>
        <span className="health-label">
          {overallHealth === 'healthy' && 'All Systems Operational'}
          {overallHealth === 'warning' && 'Some Services Degraded'}
          {overallHealth === 'critical' && 'Service Disruption'}
          {overallHealth === 'unknown' && 'System Status Unknown'}
        </span>
      </div>

      <div className="integration-grid">
        {integrations.map((integration) => {
          const status = health[integration.key] || 'unknown';
          return (
            <div key={integration.key} className="integration-item">
              <div className="integration-header">
                <span 
                  className="status-dot" 
                  style={{ color: getStatusColor(status) }}
                >
                  {getStatusIcon(status)}
                </span>
                <div className="integration-info">
                  <h4>{integration.name}</h4>
                  <p className="integration-description">{integration.description}</p>
                </div>
              </div>
              <span className={`status-text status-${status}`}>
                {getStatusText(status)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="health-footer">
        <span className="last-checked">
          Last checked: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default IntegrationStatus;
