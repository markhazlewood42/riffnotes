-- Run this AFTER the migration in Supabase SQL Editor
-- Backfills profile rows for existing users and sets admin

-- Backfill profiles for existing users
INSERT INTO profiles (id, full_name, email, avatar_url)
SELECT
  u.id,
  u.raw_user_meta_data->>'full_name',
  u.email,
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Set admin
UPDATE profiles
SET is_admin = true
WHERE email = 'markhazlewood42@gmail.com';
