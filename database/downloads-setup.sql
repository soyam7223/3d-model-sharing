-- Downloads table setup and policies
-- Run this in your Supabase SQL Editor

-- Ensure downloads table exists with correct structure
CREATE TABLE IF NOT EXISTS public.downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_downloads_model_id ON public.downloads(model_id);
CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON public.downloads(downloaded_at DESC);

-- Enable RLS
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Downloads are viewable by everyone" ON public.downloads;
DROP POLICY IF EXISTS "Anyone can create downloads" ON public.downloads;
DROP POLICY IF EXISTS "Users can view own downloads" ON public.downloads;

-- Create RLS policies
-- Everyone can view download counts (for public stats)
CREATE POLICY "Downloads are viewable by everyone" ON public.downloads
  FOR SELECT USING (true);

-- Authenticated users can create downloads
CREATE POLICY "Authenticated users can create downloads" ON public.downloads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own download history
CREATE POLICY "Users can view own downloads" ON public.downloads
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure the trigger for updating model download counts exists
-- This should already be in your schema.sql, but let's make sure
CREATE OR REPLACE FUNCTION update_model_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'downloads' THEN
      UPDATE public.models SET download_count = download_count + 1 WHERE id = NEW.model_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_download_count ON public.downloads;
CREATE TRIGGER trigger_update_download_count
  AFTER INSERT ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION update_model_counts();

-- Insert some sample download data for testing (optional)
-- INSERT INTO public.downloads (model_id, user_id, ip_address, user_agent) VALUES
--   ('your-model-id-here', 'your-user-id-here', '127.0.0.1', 'Test User Agent');

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'downloads';

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'downloads';
