-- Supervisor Schema for Note Manager
-- Run this in your Supabase SQL Editor AFTER the initial schema

-- Create user_profiles table to store user metadata
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'supervisor')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update their own profile (for last_login)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Only supervisors can insert profiles (or via trigger)
CREATE POLICY "Supervisors can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
    OR NOT EXISTS (SELECT 1 FROM user_profiles) -- Allow first user
  );

-- Update notes RLS policy to allow supervisors to view all notes
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes or supervisors can view all"
  ON notes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'supervisor'
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name, role, last_login)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MANUAL STEP: Run these after creating the table
-- =====================================================

-- 1. Create profile for existing user jos@notemanager.xx as SUPERVISOR
-- INSERT INTO user_profiles (id, email, display_name, role, last_login)
-- SELECT id, email, 'Jos (Supervisor)', 'supervisor', NOW()
-- FROM auth.users
-- WHERE email = 'jos@notemanager.xx'
-- ON CONFLICT (id) DO UPDATE SET role = 'supervisor', display_name = 'Jos (Supervisor)';

-- 2. Create profile for RobertJan (replace email with actual email)
-- INSERT INTO user_profiles (id, email, display_name, role, last_login)
-- SELECT id, email, 'RobertJan', 'user', NOW()
-- FROM auth.users
-- WHERE email = 'robertjan@example.com'
-- ON CONFLICT (id) DO UPDATE SET display_name = 'RobertJan';
