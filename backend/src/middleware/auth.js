const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

class AuthMiddleware {
  // Generate JWT access token
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription_tier: user.subscription_tier
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Generate refresh token
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
  }

  // Middleware to verify JWT token
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch user from database
        const result = await db.query(
          'SELECT id, email, full_name, role, subscription_tier, is_active FROM users WHERE id = $1',
          [decoded.id]
        );

        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (!user.is_active) {
          return res.status(403).json({ error: 'Account is inactive' });
        }

        // Attach user to request
        req.user = user;
        next();
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token' });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // Middleware to check if user is admin
  requireAdmin = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  };

  // Middleware to check subscription tier
  requireSubscription = (...allowedTiers) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!allowedTiers.includes(req.user.subscription_tier)) {
        return res.status(403).json({ 
          error: 'Subscription upgrade required',
          required: allowedTiers,
          current: req.user.subscription_tier
        });
      }

      next();
    };
  };

  // Optional authentication (doesn't fail if no token)
  optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const result = await db.query(
        'SELECT id, email, full_name, role, subscription_tier, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = result.rows[0];
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }
    
    next();
  };

  // Store refresh token in database
  async storeRefreshToken(userId, refreshToken, ipAddress, userAgent) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.query(
      `INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, refreshToken, expiresAt, ipAddress, userAgent]
    );
  }

  // Clean up expired refresh tokens
  async cleanupExpiredTokens() {
    await db.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  }

  // Revoke all user sessions (logout from all devices)
  async revokeAllUserSessions(userId) {
    await db.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
  }

  // Log audit event
  async logAuditEvent(userId, action, resourceType, resourceId, details, ipAddress) {
    await db.query(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress]
    );
  }
}

module.exports = new AuthMiddleware();
