const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const auth = require('../middleware/auth');

const SALT_ROUNDS = 10;

// POST /api/auth/register - Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    // Validation
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, role, subscription_tier, created_at`,
      [email, passwordHash, fullName]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = auth.generateAccessToken(user);
    const refreshToken = auth.generateRefreshToken(user);

    // Store refresh token
    await auth.storeRefreshToken(
      user.id,
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );

    // Log audit event
    await auth.logAuditEvent(user.id, 'USER_REGISTERED', 'user', user.id, {}, req.ip);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        subscriptionTier: user.subscription_tier
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const accessToken = auth.generateAccessToken(user);
    const refreshToken = auth.generateRefreshToken(user);

    // Store refresh token
    await auth.storeRefreshToken(
      user.id,
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );

    // Log audit event
    await auth.logAuditEvent(user.id, 'USER_LOGIN', 'user', user.id, {}, req.ip);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        subscriptionTier: user.subscription_tier
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = require('jsonwebtoken').verify(refreshToken, process.env.JWT_SECRET || 'change-this-secret-in-production');
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if refresh token exists in database
    const sessionResult = await db.query(
      'SELECT * FROM user_sessions WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()',
      [decoded.id, refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    // Get user
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];

    // Generate new access token
    const accessToken = auth.generateAccessToken(user);

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        subscriptionTier: user.subscription_tier
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Logout user
router.post('/logout', auth.authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove specific session
      await db.query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND refresh_token = $2',
        [req.user.id, refreshToken]
      );
    }

    // Log audit event
    await auth.logAuditEvent(req.user.id, 'USER_LOGOUT', 'user', req.user.id, {}, req.ip);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', auth.authenticate, async (req, res, next) => {
  try {
    await auth.revokeAllUserSessions(req.user.id);

    // Log audit event
    await auth.logAuditEvent(req.user.id, 'USER_LOGOUT_ALL', 'user', req.user.id, {}, req.ip);

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', auth.authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, full_name, role, subscription_tier, is_active, 
              email_verified, created_at, last_login
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get usage stats
    const statsResult = await db.query(
      'SELECT * FROM user_usage_stats WHERE user_id = $1',
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        subscriptionTier: user.subscription_tier,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      stats: statsResult.rows[0] || null
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', auth.authenticate, async (req, res, next) => {
  try {
    const { fullName } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    await db.query(
      'UPDATE users SET full_name = $1 WHERE id = $2',
      [fullName, req.user.id]
    );

    // Log audit event
    await auth.logAuditEvent(
      req.user.id, 
      'PROFILE_UPDATED', 
      'user', 
      req.user.id, 
      { fullName }, 
      req.ip
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/password - Change password
router.put('/password', auth.authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    // Revoke all sessions (force re-login)
    await auth.revokeAllUserSessions(req.user.id);

    // Log audit event
    await auth.logAuditEvent(
      req.user.id, 
      'PASSWORD_CHANGED', 
      'user', 
      req.user.id, 
      {}, 
      req.ip
    );

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
