-- 3Dsharespace Database Schema
-- PostgreSQL database schema for the 3D model sharing platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    avatar VARCHAR(500),
    bio TEXT,
    website VARCHAR(500),
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'CREATOR', 'ADMIN')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Models table
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    tags TEXT[] DEFAULT '{}',
    file_url VARCHAR(500) NOT NULL,
    preview_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    file_size INTEGER NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_free BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, model_id)
);

-- Follows table
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id)
);

-- Model views table
CREATE TABLE model_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Downloads table
CREATE TABLE downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Earnings table
CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DONATION', 'AD_REVENUE', 'PREMIUM_SUBSCRIPTION')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_models_user_id ON models(user_id);
CREATE INDEX idx_models_category ON models(category);
CREATE INDEX idx_models_created_at ON models(created_at);
CREATE INDEX idx_models_is_public ON models(is_public);
CREATE INDEX idx_models_tags ON models USING GIN(tags);
CREATE INDEX idx_models_search ON models USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX idx_comments_model_id ON comments(model_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

CREATE INDEX idx_likes_model_id ON likes(model_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

CREATE INDEX idx_model_views_model_id ON model_views(model_id);
CREATE INDEX idx_model_views_created_at ON model_views(created_at);

CREATE INDEX idx_downloads_model_id ON downloads(model_id);
CREATE INDEX idx_downloads_created_at ON downloads(created_at);

CREATE INDEX idx_earnings_user_id ON earnings(user_id);
CREATE INDEX idx_earnings_status ON earnings(status);

-- Full-text search index for models
CREATE INDEX idx_models_fulltext ON models USING GIN(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(array_to_string(tags, ' '), '')
    )
);

-- Triggers for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_earnings_updated_at BEFORE UPDATE ON earnings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_model_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE models 
    SET view_count = view_count + 1 
    WHERE id = NEW.model_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_view_count AFTER INSERT ON model_views
    FOR EACH ROW EXECUTE FUNCTION increment_model_view_count();

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_model_download_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE models 
    SET download_count = download_count + 1 
    WHERE id = NEW.model_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_download_count AFTER INSERT ON downloads
    FOR EACH ROW EXECUTE FUNCTION increment_model_download_count();

-- Function to update like count
CREATE OR REPLACE FUNCTION update_model_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE models 
        SET like_count = like_count + 1 
        WHERE id = NEW.model_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE models 
        SET like_count = like_count - 1 
        WHERE id = OLD.model_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_like_count AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_model_like_count();

-- Sample data insertion (optional)
INSERT INTO users (email, username, password, first_name, last_name, role, is_verified) VALUES
('admin@3dsharespace.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQZxKz8O', 'Admin', 'User', 'ADMIN', true),
('creator@3dsharespace.com', 'creator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQZxKz8O', 'Sample', 'Creator', 'CREATOR', true);

-- Create a view for model statistics
CREATE VIEW model_stats AS
SELECT 
    m.id,
    m.title,
    m.category,
    m.tags,
    m.download_count,
    m.view_count,
    m.like_count,
    m.created_at,
    u.username as creator_username,
    u.avatar as creator_avatar,
    COUNT(c.id) as comment_count
FROM models m
JOIN users u ON m.user_id = u.id
LEFT JOIN comments c ON m.id = c.model_id
WHERE m.is_public = true
GROUP BY m.id, u.username, u.avatar;

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
