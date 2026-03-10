-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Step 1: Add is_locked column
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Step 2: Trigger function to seed example song for new users
CREATE OR REPLACE FUNCTION seed_example_song_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  INSERT INTO songs (user_id, title, document, annotations, is_locked)
  VALUES (
    NEW.id,
    'Knockin'' on Heaven''s Door',
    $doc${"type":"doc","content":[{"type":"songTitle","content":[{"type":"text","text":"Knockin' on Heaven's Door"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-1"},"content":[{"type":"text","text":"Mama, take this badge off of me"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-2"},"content":[{"type":"text","text":"I can't use it anymore"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-3"},"content":[{"type":"text","text":"It's gettin' dark, too dark to see"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-4"},"content":[{"type":"text","text":"I feel I'm knockin' on heaven's door"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-5"},"content":[]},{"type":"paragraph","attrs":{"lineId":"line-seed-6"},"content":[{"type":"text","text":"Knock, knock, knockin' on heaven's door"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-7"},"content":[{"type":"text","text":"Knock, knock, knockin' on heaven's door"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-8"},"content":[{"type":"text","text":"Knock, knock, knockin' on heaven's door"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-9"},"content":[{"type":"text","text":"Knock, knock, knockin' on heaven's door"}]}]}$doc$::jsonb,
    $ann${"ann-seed-1":{"id":"ann-seed-1","type":"chord","lineId":"line-seed-1","charOffset":0,"text":"G"},"ann-seed-2":{"id":"ann-seed-2","type":"chord","lineId":"line-seed-1","charOffset":7,"text":"D"},"ann-seed-3":{"id":"ann-seed-3","type":"chord","lineId":"line-seed-2","charOffset":0,"text":"Am"},"ann-seed-4":{"id":"ann-seed-4","type":"chord","lineId":"line-seed-2","charOffset":5,"text":"C"},"ann-seed-5":{"id":"ann-seed-5","type":"chord","lineId":"line-seed-3","charOffset":0,"text":"G"},"ann-seed-6":{"id":"ann-seed-6","type":"chord","lineId":"line-seed-3","charOffset":3,"text":"D"},"ann-seed-7":{"id":"ann-seed-7","type":"chord","lineId":"line-seed-4","charOffset":0,"text":"G"},"ann-seed-8":{"id":"ann-seed-8","type":"chord","lineId":"line-seed-4","charOffset":8,"text":"D"},"ann-seed-9":{"id":"ann-seed-9","type":"right-side","style":"default","lineId":"line-seed-1","text":"👆 Select any word, then tap Chord in the popup toolbar to add a chord like these"},"ann-seed-10":{"id":"ann-seed-10","type":"right-side","style":"default","lineId":"line-seed-4","text":"🎵 let it ring — big finish"},"ann-seed-11":{"id":"ann-seed-11","type":"image","lineId":"line-seed-6","dataUrl":"PLACEHOLDER"},"ann-seed-12":{"id":"ann-seed-12","type":"right-side","style":"default","lineId":"line-seed-7","text":"👆 Select a line, tap Image in the toolbar — or paste a copied image with ⌘V / Ctrl+V"}}$ann$::jsonb,
    true
  );
  RETURN NEW;
END;
$body$;

CREATE OR REPLACE TRIGGER seed_example_song_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_example_song_for_new_user();
