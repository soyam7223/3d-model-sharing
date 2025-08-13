-- 3Dsharespace Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'CREATOR', 'MODERATOR', 'ADMIN')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Models table
CREATE TABLE IF NOT EXISTS public.models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  tags TEXT, -- Comma-separated tags for SQLite compatibility
  file_url TEXT NOT NULL,
  preview_url TEXT,
  thumbnail_url TEXT,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  is_free BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(model_id, user_id)
);

-- Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Model views table
CREATE TABLE IF NOT EXISTS public.model_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Downloads table
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Earnings table
CREATE TABLE IF NOT EXISTS public.earnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'DONATION', 'SPONSORSHIP', 'AD_REVENUE'
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_models_category ON public.models(category);
CREATE INDEX IF NOT EXISTS idx_models_user_id ON public.models(user_id);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON public.models(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_models_featured ON public.models(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_models_public ON public.models(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_models_free ON public.models(is_free) WHERE is_free = TRUE;

CREATE INDEX IF NOT EXISTS idx_comments_model_id ON public.comments(model_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_likes_model_id ON public.likes(model_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

CREATE INDEX IF NOT EXISTS idx_model_views_model_id ON public.model_views(model_id);
CREATE INDEX IF NOT EXISTS idx_model_views_viewed_at ON public.model_views(viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_downloads_model_id ON public.downloads(model_id);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);

-- Full-text search index for models
CREATE INDEX IF NOT EXISTS idx_models_search ON public.models USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, ''))
);

-- Triggers for updating counts
CREATE OR REPLACE FUNCTION update_model_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'likes' THEN
      UPDATE public.models SET like_count = like_count + 1 WHERE id = NEW.model_id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
      UPDATE public.models SET comment_count = comment_count + 1 WHERE id = NEW.model_id;
    ELSIF TG_TABLE_NAME = 'downloads' THEN
      UPDATE public.models SET download_count = download_count + 1 WHERE id = NEW.model_id;
    ELSIF TG_TABLE_NAME = 'model_views' THEN
      UPDATE public.models SET view_count = view_count + 1 WHERE id = NEW.model_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'likes' THEN
      UPDATE public.models SET like_count = like_count - 1 WHERE id = OLD.model_id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
      UPDATE public.models SET comment_count = comment_count - 1 WHERE id = OLD.model_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION update_model_counts();

CREATE TRIGGER trigger_update_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_model_counts();

CREATE TRIGGER trigger_update_download_count
  AFTER INSERT ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION update_model_counts();

CREATE TRIGGER trigger_update_view_count
  AFTER INSERT ON public.model_views
  FOR EACH ROW EXECUTE FUNCTION update_model_counts();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_earnings_updated_at
  BEFORE UPDATE ON public.earnings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Models policies
CREATE POLICY "Public models are viewable by everyone" ON public.models
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own models" ON public.models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create models" ON public.models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models" ON public.models
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models" ON public.models
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create likes" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Follows are viewable by everyone" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create follows" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows" ON public.follows
  FOR DELETE USING (auth.uid() = user_id);

-- Model views policies
CREATE POLICY "Model views are viewable by everyone" ON public.model_views
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create model views" ON public.model_views
  FOR INSERT WITH CHECK (true);

-- Downloads policies
CREATE POLICY "Downloads are viewable by everyone" ON public.downloads
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create downloads" ON public.downloads
  FOR INSERT WITH CHECK (true);

-- Earnings policies
CREATE POLICY "Users can view own earnings" ON public.earnings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create earnings" ON public.earnings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert sample data for testing
INSERT INTO public.profiles (id, username, display_name, bio, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin User', 'Platform administrator', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', 'demo_creator', 'Demo Creator', 'Sample creator account', 'CREATOR'),
  ('00000000-0000-0000-0000-000000000003', 'demo_user', 'Demo User', 'Sample user account', 'USER')
ON CONFLICT (id) DO NOTHING;

-- Note: You'll need to create real user accounts through Supabase Auth first
-- These are just placeholder profiles for testing
