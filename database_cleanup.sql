-- Database Cleanup for MVP
-- Run these SQL commands in your Supabase SQL editor

-- 1. Drop unused tables
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- 2. Ensure only these tables remain with correct schema
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  tags TEXT[],
  file_path TEXT,
  thumbnail_path TEXT,
  downloads_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS downloads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  model_id UUID REFERENCES models(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Public profiles are viewable
CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (true);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Anyone can view models
CREATE POLICY "Anyone can view models" ON models
  FOR SELECT USING (true);

-- Signed in can upload models
CREATE POLICY "Signed in can upload models" ON models
  FOR INSERT USING (auth.uid() = user_id);

-- Owner can update/delete own model
CREATE POLICY "Owner can update/delete own model" ON models
  FOR UPDATE, DELETE USING (auth.uid() = user_id);

-- Signed in can record downloads
CREATE POLICY "Signed in can record downloads" ON downloads
  FOR INSERT USING (auth.uid() = user_id);

-- Users can view their own downloads
CREATE POLICY "Users can view own downloads" ON downloads
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_model_id ON downloads(model_id);

-- 6. Create function to update download count
CREATE OR REPLACE FUNCTION update_model_download_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE models 
    SET downloads_count = downloads_count + 1 
    WHERE id = NEW.model_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE models 
    SET downloads_count = GREATEST(downloads_count - 1, 0) 
    WHERE id = OLD.model_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for download count
DROP TRIGGER IF EXISTS trigger_update_download_count ON downloads;
CREATE TRIGGER trigger_update_download_count
  AFTER INSERT OR DELETE ON downloads
  FOR EACH ROW
  EXECUTE FUNCTION update_model_download_count();

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON models TO authenticated;
GRANT SELECT, INSERT ON downloads TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON models TO anon;
GRANT SELECT ON profiles TO anon;

-- 9. Verify the setup
SELECT 
  'Database cleanup completed successfully' as status,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM models) as total_models,
  (SELECT COUNT(*) FROM downloads) as total_downloads;

