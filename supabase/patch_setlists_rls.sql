-- Patch: tighten RLS policies on setlists and setlist_songs
-- Run this on databases that already have add_setlists.sql applied

-- 1. setlists UPDATE: add WITH CHECK to prevent user_id reassignment
DROP POLICY "Users can update their own setlists" ON setlists;
CREATE POLICY "Users can update their own setlists"
  ON setlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. setlist_songs INSERT: also verify song ownership
DROP POLICY "Users can insert their own setlist_songs" ON setlist_songs;
CREATE POLICY "Users can insert their own setlist_songs"
  ON setlist_songs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM songs WHERE id = song_id AND user_id = auth.uid())
  );

-- 3. setlist_songs UPDATE: add WITH CHECK + verify song ownership
DROP POLICY "Users can update their own setlist_songs" ON setlist_songs;
CREATE POLICY "Users can update their own setlist_songs"
  ON setlist_songs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM songs WHERE id = song_id AND user_id = auth.uid())
  );
