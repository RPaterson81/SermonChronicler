-- SermonChronicler Database Schema v3.0
-- PostgreSQL Schema for User Authentication and Multi-tenancy

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');

-- Subscription tiers enum (for future use)
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    subscription_tier subscription_tier DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Sermons table (migrated from JSON)
CREATE TABLE sermons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sermon_name VARCHAR(500) NOT NULL,
    speaker VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    submission_type VARCHAR(20) DEFAULT 'transcript', -- 'transcript' or 'youtube'
    youtube_url TEXT,
    youtube_video_id VARCHAR(20),
    transcript_path TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated files tracking
CREATE TABLE sermon_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sermon_id UUID NOT NULL REFERENCES sermons(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- 'cleanTranscript', 'notes', etc.
    file_path TEXT NOT NULL,
    is_ready BOOLEAN DEFAULT false,
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sermon_id, file_type)
);

-- User sessions (JWT refresh tokens)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Audit log for admin monitoring
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sermons_user_id ON sermons(user_id);
CREATE INDEX idx_sermons_status ON sermons(status);
CREATE INDEX idx_sermons_created_at ON sermons(created_at DESC);
CREATE INDEX idx_sermon_files_sermon_id ON sermon_files(sermon_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sermons_updated_at BEFORE UPDATE ON sermons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create initial admin user (password: 'admin123' - CHANGE THIS!)
-- Bcrypt hash for 'admin123' with 10 rounds
INSERT INTO users (email, password_hash, full_name, role, subscription_tier, email_verified)
VALUES (
    'admin@sermonchronicler.com',
    '$2b$10$rYvK9H.8pJxR9YrMxMQDqO6VZ5QZLhZ8YqH5rHYvJlYGF5vW5qN8W',
    'Admin User',
    'admin',
    'enterprise',
    true
);

-- Views for common queries
CREATE VIEW active_sermons AS
SELECT 
    s.*,
    u.full_name as user_name,
    u.email as user_email,
    COUNT(sf.id) FILTER (WHERE sf.is_ready = true) as ready_files_count,
    COUNT(sf.id) as total_files_count
FROM sermons s
JOIN users u ON s.user_id = u.id
LEFT JOIN sermon_files sf ON s.sermon_id = sf.sermon_id
WHERE u.is_active = true
GROUP BY s.id, u.full_name, u.email;

-- Subscription limits view (for future use)
CREATE VIEW user_usage_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.subscription_tier,
    COUNT(s.id) as total_sermons,
    COUNT(s.id) FILTER (WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days') as sermons_this_month,
    COUNT(s.id) FILTER (WHERE s.status = 'complete') as completed_sermons
FROM users u
LEFT JOIN sermons s ON u.id = s.user_id
GROUP BY u.id, u.email, u.subscription_tier;
