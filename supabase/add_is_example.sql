-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Decouples "is this a practice/example song" from "is this song locked for editing"
-- so the example song can be edited but still cannot be deleted.

-- Step 1: Add is_example column
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS is_example boolean NOT NULL DEFAULT false;

-- Step 2: Update trigger to seed an editable practice song (is_locked=false, is_example=true)
--         Also removes the two static instructional right-side annotations (ann-seed-16, ann-seed-17)
--         since the interactive onboarding tour replaces them.
CREATE OR REPLACE FUNCTION seed_example_song_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
BEGIN
  INSERT INTO songs (user_id, title, document, annotations, is_locked, is_example)
  VALUES (
    NEW.id,
    'Knockin'' on Heaven''s Door',
    $doc${"type":"doc","content":[{"type":"songTitle","attrs":{"level":1},"content":[{"text":"Knockin' on Heaven's Door","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-1"},"content":[{"text":"Mama, take this badge off of me","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-2"},"content":[{"text":"I can't use it anymore","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-3"},"content":[{"text":"It's gettin' dark, too dark to see","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-4"},"content":[{"text":"I feel I'm knockin' on heaven's door","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-5"}},{"type":"paragraph","attrs":{"lineId":"line-seed-6"},"content":[{"text":"Knock, knock, knockin' on heaven's door","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-7"},"content":[{"text":"Knock, knock, knockin' on heaven's door","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-8"},"content":[{"text":"Knock, knock, knockin' on heaven's door","type":"text"}]},{"type":"paragraph","attrs":{"lineId":"line-seed-9"},"content":[{"text":"Knock, knock, knockin' on heaven's door","type":"text"}]}]}$doc$::jsonb,
    $ann${"ann-seed-1":{"id":"ann-seed-1","type":"chord","value":"G","lineId":"line-seed-1","charOffset":0,"charOffsetEnd":5},"ann-seed-2":{"id":"ann-seed-2","type":"chord","value":"D","lineId":"line-seed-1","charOffset":6,"charOffsetEnd":10},"ann-seed-3":{"id":"ann-seed-3","type":"chord","value":"Am","lineId":"line-seed-1","charOffset":29,"charOffsetEnd":31},"ann-seed-4":{"id":"ann-seed-4","type":"chord","value":"G","lineId":"line-seed-2","charOffset":0,"charOffsetEnd":1},"ann-seed-5":{"id":"ann-seed-5","type":"chord","value":"D","lineId":"line-seed-2","charOffset":8,"charOffsetEnd":11},"ann-seed-6":{"id":"ann-seed-6","type":"chord","value":"C","lineId":"line-seed-2","charOffset":15,"charOffsetEnd":22},"ann-seed-7":{"id":"ann-seed-7","type":"chord","value":"G","lineId":"line-seed-3","charOffset":0,"charOffsetEnd":4},"ann-seed-8":{"id":"ann-seed-8","type":"chord","value":"D","lineId":"line-seed-3","charOffset":13,"charOffsetEnd":18},"ann-seed-9":{"id":"ann-seed-9","type":"chord","value":"Am","lineId":"line-seed-3","charOffset":31,"charOffsetEnd":34},"ann-seed-10":{"id":"ann-seed-10","type":"chord","value":"G","lineId":"line-seed-4","charOffset":2,"charOffsetEnd":6},"ann-seed-11":{"id":"ann-seed-11","type":"chord","value":"D","lineId":"line-seed-4","charOffset":11,"charOffsetEnd":19},"ann-seed-12":{"id":"ann-seed-12","type":"chord","value":"C","lineId":"line-seed-4","charOffset":32,"charOffsetEnd":36},"ann-seed-13":{"id":"ann-seed-13","type":"chord","value":"G","lineId":"line-seed-6","charOffset":0,"charOffsetEnd":6},"ann-seed-14":{"id":"ann-seed-14","type":"chord","value":"D","lineId":"line-seed-6","charOffset":14,"charOffsetEnd":22},"ann-seed-15":{"id":"ann-seed-15","type":"chord","value":"C","lineId":"line-seed-6","charOffset":35,"charOffsetEnd":39},"ann-seed-18":{"id":"ann-seed-18","type":"image","lineId":"line-seed-6","url":"https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/example-notation.png","charOffset":35}}$ann$::jsonb,
    false,
    true
  );
  RETURN NEW;
END;
$body$;

-- Step 3: Backfill existing users — unlock their example songs and mark them as is_example
UPDATE songs
SET is_locked = false, is_example = true
WHERE is_locked = true;
