-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Step 1: Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Trigger function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- Step 3: Helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = uid AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Step 4: RLS policies on profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

-- Step 5: Admin RLS policy on songs (existing policies unchanged)
CREATE POLICY "Admins can read all songs"
  ON songs FOR SELECT
  USING (is_admin(auth.uid()));
