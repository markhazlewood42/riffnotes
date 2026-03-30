-- Set lists table
CREATE TABLE setlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX setlists_user_id_idx ON setlists(user_id);

ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own setlists"
  ON setlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own setlists"
  ON setlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own setlists"
  ON setlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own setlists"
  ON setlists FOR DELETE USING (auth.uid() = user_id);

-- Reuse existing trigger function from migration.sql
CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Junction table for songs in setlists
CREATE TABLE setlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id uuid REFERENCES setlists(id) ON DELETE CASCADE NOT NULL,
  song_id uuid REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(setlist_id, song_id)
);

CREATE INDEX setlist_songs_setlist_idx ON setlist_songs(setlist_id, position);
CREATE INDEX setlist_songs_song_idx ON setlist_songs(song_id);

ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;

-- RLS via join to setlists (user owns the parent setlist)
CREATE POLICY "Users can view their own setlist_songs"
  ON setlist_songs FOR SELECT
  USING (EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own setlist_songs"
  ON setlist_songs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM songs WHERE id = song_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can update their own setlist_songs"
  ON setlist_songs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM songs WHERE id = song_id AND user_id = auth.uid())
  );
CREATE POLICY "Users can delete their own setlist_songs"
  ON setlist_songs FOR DELETE
  USING (EXISTS (SELECT 1 FROM setlists WHERE id = setlist_id AND user_id = auth.uid()));
