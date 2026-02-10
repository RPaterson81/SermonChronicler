const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');
const authRoutes = require('./routes/auth');
const sermonRoutes = require('./routes/sermons-v3');
const submissionRoutes = require('./routes/submissions');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for outputs
app.use('/outputs', express.static(path.join(__dirname, '../outputs')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sermons', sermonRoutes);
app.use('/api/submissions', submissionRoutes);

// Health check with database status
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '3.0.0'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin endpoint to view system stats
app.get('/api/admin/stats', auth.authenticate, auth.requireAdmin, async (req, res, next) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM sermons) as total_sermons,
        (SELECT COUNT(*) FROM sermons WHERE status = 'complete') as completed_sermons,
        (SELECT COUNT(*) FROM sermons WHERE status = 'processing') as processing_sermons,
        (SELECT COUNT(*) FROM sermons WHERE status = 'failed') as failed_sermons
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size exceeds limit (10MB)' });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🚀 SermonChronicler v3.0 starting...');
    
    // Initialize database connection
    await db.initialize();
    console.log('✓ Database initialized');
    
    // Clean up expired refresh tokens on startup
    await auth.cleanupExpiredTokens();
    console.log('✓ Expired tokens cleaned up');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ SermonChronicler API running on port ${PORT}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`  API endpoints: http://localhost:${PORT}/api`);
      console.log('');
      console.log('  Authentication endpoints:');
      console.log('    POST /api/auth/register - Register new user');
      console.log('    POST /api/auth/login - Login');
      console.log('    POST /api/auth/refresh - Refresh token');
      console.log('    GET  /api/auth/me - Get profile');
      console.log('');
      console.log('  Default admin credentials:');
      console.log('    Email: admin@sermonchronicler.com');
      console.log('    Password: admin123 (CHANGE THIS!)');
    });
    
    // Schedule periodic cleanup of expired tokens (every hour)
    setInterval(async () => {
      try {
        await auth.cleanupExpiredTokens();
        console.log('✓ Periodic token cleanup completed');
      } catch (error) {
        console.error('✗ Token cleanup error:', error);
      }
    }, 60 * 60 * 1000);
    
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully...');
  await db.close();
  process.exit(0);
});

startServer();

module.exports = app;
