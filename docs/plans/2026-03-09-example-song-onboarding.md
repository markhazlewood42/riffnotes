# Example Song Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every new user gets a seeded "Knockin' on Heaven's Door" example song with chord, right-side note, and image annotations that teach them how to use the app.

**Architecture:** A Postgres `AFTER INSERT ON auth.users` trigger (SECURITY DEFINER) inserts the example song server-side. The `songs` table gets an `is_locked` boolean column. SongBrowser renders a Lock icon instead of a delete button for locked songs.

**Tech Stack:** PostgreSQL (Supabase SQL Editor), React, lucide-react, existing annotationReducer types (`chord`, `right-side`, `image`).

---

## Before You Start

- Run migrations in **Supabase Dashboard → SQL Editor → New Query**
- Existing migration for reference: `supabase/migration.sql`
- TipTap document JSON format: `{ "type": "doc", "content": [ songTitle node, ...paragraph nodes ] }`
- Each `paragraph` node needs `"attrs": { "lineId": "<stable-id>" }` — these are the keys annotations reference
- Annotation object shapes (from `src/context/annotationReducer.js`):
  - chord: `{ id, type: "chord", lineId, charOffset, text }`
  - right-side: `{ id, type: "right-side", lineId, text, style: "default" }`
  - image: `{ id, type: "image", lineId, dataUrl }`
- Image `dataUrl` will be a base64 data URL provided by the user — leave as `"PLACEHOLDER"` until provided

---

## Task 1: Add `is_locked` column

**Files:**
- Create: `supabase/add_is_locked_and_example_song.sql`

**Step 1: Create the migration file with the ALTER TABLE**

```sql
-- supabase/add_is_locked_and_example_song.sql
-- Step 1: Add is_locked column
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
```

**Step 2: Run it in Supabase SQL Editor**

Paste and execute. Expected: `ALTER TABLE` success, no errors.

**Step 3: Verify in Supabase Table Editor**

Open `songs` table — confirm `is_locked` column exists with default `false`.

**Step 4: Commit the file**

```bash
git add supabase/add_is_locked_and_example_song.sql
git commit -m "feat: add is_locked column to songs table"
```

---

## Task 2: Write and run the trigger migration

**Files:**
- Modify: `supabase/add_is_locked_and_example_song.sql`

**Step 1: Construct the full document + annotations JSON**

The TipTap document for the example song (paste into the SQL below):

```json
{
  "type": "doc",
  "content": [
    {
      "type": "songTitle",
      "content": [{ "type": "text", "text": "Knockin' on Heaven's Door" }]
    },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-1" }, "content": [{ "type": "text", "text": "Mama, take this badge off of me" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-2" }, "content": [{ "type": "text", "text": "I can't use it anymore" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-3" }, "content": [{ "type": "text", "text": "It's gettin' dark, too dark to see" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-4" }, "content": [{ "type": "text", "text": "I feel I'm knockin' on heaven's door" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-5" }, "content": [] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-6" }, "content": [{ "type": "text", "text": "Knock, knock, knockin' on heaven's door" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-7" }, "content": [{ "type": "text", "text": "Knock, knock, knockin' on heaven's door" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-8" }, "content": [{ "type": "text", "text": "Knock, knock, knockin' on heaven's door" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-9" }, "content": [{ "type": "text", "text": "Knock, knock, knockin' on heaven's door" }] }
  ]
}
```

The annotations JSON:

```json
{
  "ann-seed-1": { "id": "ann-seed-1", "type": "chord", "lineId": "line-seed-1", "charOffset": 0, "text": "G" },
  "ann-seed-2": { "id": "ann-seed-2", "type": "chord", "lineId": "line-seed-1", "charOffset": 7, "text": "D" },
  "ann-seed-3": { "id": "ann-seed-3", "type": "chord", "lineId": "line-seed-2", "charOffset": 0, "text": "Am" },
  "ann-seed-4": { "id": "ann-seed-4", "type": "chord", "lineId": "line-seed-2", "charOffset": 5, "text": "C" },
  "ann-seed-5": { "id": "ann-seed-5", "type": "chord", "lineId": "line-seed-3", "charOffset": 0, "text": "G" },
  "ann-seed-6": { "id": "ann-seed-6", "type": "chord", "lineId": "line-seed-3", "charOffset": 3, "text": "D" },
  "ann-seed-7": { "id": "ann-seed-7", "type": "chord", "lineId": "line-seed-4", "charOffset": 0, "text": "G" },
  "ann-seed-8": { "id": "ann-seed-8", "type": "chord", "lineId": "line-seed-4", "charOffset": 8, "text": "D" },
  "ann-seed-9": {
    "id": "ann-seed-9",
    "type": "right-side",
    "style": "default",
    "lineId": "line-seed-1",
    "text": "👆 Select any word, then tap Chord in the popup toolbar to add a chord like these"
  },
  "ann-seed-10": {
    "id": "ann-seed-10",
    "type": "right-side",
    "style": "default",
    "lineId": "line-seed-4",
    "text": "🎵 let it ring — big finish"
  },
  "ann-seed-11": {
    "id": "ann-seed-11",
    "type": "image",
    "lineId": "line-seed-6",
    "dataUrl": "PLACEHOLDER"
  },
  "ann-seed-12": {
    "id": "ann-seed-12",
    "type": "right-side",
    "style": "default",
    "lineId": "line-seed-7",
    "text": "👆 Select a line, tap Image in the toolbar — or paste a copied image with ⌘V / Ctrl+V"
  }
}
```

**Step 2: Append the trigger to the migration file**

```sql
-- Step 2: Trigger function to seed example song for new users
CREATE OR REPLACE FUNCTION seed_example_song_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO songs (user_id, title, document, annotations, is_locked)
  VALUES (
    NEW.id,
    'Knockin'' on Heaven''s Door',
    '{
      "type": "doc",
      "content": [
        { "type": "songTitle", "content": [{ "type": "text", "text": "Knockin'\''s on Heaven'\''s Door" }] },
        ... (full JSON from Step 1, minified, with single-quotes escaped as '\'')
    }'::jsonb,
    '{ ... annotations JSON ... }'::jsonb,
    true
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER seed_example_song_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_example_song_for_new_user();
```

> **Important note on quoting:** The JSON must be embedded as a PostgreSQL dollar-quoted string or have all single quotes escaped as `''`. Use `$body$...$body$` dollar quoting to avoid escaping issues. See the exact SQL in Step 3 below.

**Step 3: Full trigger SQL to paste into Supabase SQL Editor**

```sql
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
```

**Step 4: Run in Supabase SQL Editor**

Expected: `CREATE FUNCTION` + `CREATE TRIGGER` success messages.

**Step 5: Test the trigger manually**

In SQL Editor, find a test user's UUID and manually call the function to verify:
```sql
-- Insert a fake user row to test (use a non-existent UUID)
-- Or directly test the insert:
SELECT seed_example_song_for_new_user();  -- won't work directly, but check function exists:
SELECT proname FROM pg_proc WHERE proname = 'seed_example_song_for_new_user';
-- Expected: one row returned
```

**Step 6: Commit**

```bash
git add supabase/add_is_locked_and_example_song.sql
git commit -m "feat: add trigger to seed example song on new user signup"
```

---

## Task 3: Replace image PLACEHOLDER with real base64

> **Prerequisite:** User provides the staff notation image file.

**Files:**
- Modify: `supabase/add_is_locked_and_example_song.sql`

**Step 1: Convert the image to base64**

```bash
# In terminal, from the directory containing the image file:
base64 -w 0 notation.png
# Copy the output string
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("notation.png"))
```

**Step 2: Build the full dataUrl string**

Format: `data:image/png;base64,<base64string>`

(Use `image/jpeg` if the file is a JPG.)

**Step 3: Update the trigger SQL**

In `supabase/add_is_locked_and_example_song.sql`, replace `"dataUrl":"PLACEHOLDER"` inside the `$ann$...$ann$` block with:

```
"dataUrl":"data:image/png;base64,<your-base64-string>"
```

**Step 4: Re-run the updated trigger SQL in Supabase SQL Editor**

The `CREATE OR REPLACE` will update the existing function in-place.

**Step 5: Backfill existing users**

Existing users who signed up before this trigger won't have the example song. After testing, optionally run a backfill:

```sql
-- Only run this if you want existing users to get the example song
-- Check which users have no songs first:
SELECT u.id FROM auth.users u
LEFT JOIN songs s ON s.user_id = u.id
WHERE s.id IS NULL;

-- If the list looks right, insert for each:
INSERT INTO songs (user_id, title, document, annotations, is_locked)
SELECT
  u.id,
  'Knockin'' on Heaven''s Door',
  $doc$...$doc$::jsonb,
  $ann$...$ann$::jsonb,
  true
FROM auth.users u
LEFT JOIN songs s ON s.user_id = u.id AND s.is_locked = true
WHERE s.id IS NULL;
```

**Step 6: Commit**

```bash
git add supabase/add_is_locked_and_example_song.sql
git commit -m "feat: add staff notation image to example song"
```

---

## Task 4: Update SongBrowser to show lock icon

**Files:**
- Modify: `src/pages/SongBrowser.jsx`
- Modify: `src/pages/SongBrowser.css`

**Step 1: Add `is_locked` to the select query**

In `SongBrowser.jsx`, find the select query (line ~18) and add `is_locked`:

```js
.select('id, title, updated_at, created_at, is_locked')
```

**Step 2: Add `Lock` to lucide imports**

```js
import { Lock, Trash2 } from 'lucide-react';
```

**Step 3: Replace the delete button with conditional rendering**

Find the `song-card-delete` button in the JSX and replace it with:

```jsx
{song.is_locked ? (
  <span className="song-card-locked" title="This song is locked">
    <Lock size={14} />
  </span>
) : (
  <button
    className="song-card-delete"
    onClick={(e) => deleteSong(e, song.id)}
    title="Delete song"
  >
    <Trash2 size={14} />
  </button>
)}
```

**Step 4: Add CSS for the lock icon**

In `SongBrowser.css`, add after `.song-card-delete`:

```css
.song-card-locked {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  padding: 4px;
  opacity: 0.5;
  cursor: default;
}
```

**Step 5: Verify in browser**

- Open SongBrowser — locked song shows lock icon instead of trash
- Hovering lock does nothing
- Other songs still show trash icon and delete normally

**Step 6: Commit**

```bash
git add src/pages/SongBrowser.jsx src/pages/SongBrowser.css
git commit -m "feat: show lock icon on locked songs in song browser"
```

---

## Task 5: End-to-end test with a new account

**Step 1: Create a fresh test account**

Sign up with a new Google account (or temporarily drop and re-insert a test user in Supabase Auth).

**Step 2: Verify the example song appears**

- SongBrowser should show "Knockin' on Heaven's Door" with a lock icon
- Opening it should show chords above verse lines
- Right-side notes should appear on lines 1, 4, and 7
- Image annotation should appear on line 6 (or show as broken if PLACEHOLDER not yet replaced)

**Step 3: Verify the lock**

- Confirm no delete button on the locked card
- Confirm other songs (create one) still show the delete button

**Step 4: Push to main**

```bash
git push origin main
```

---

## Notes

- The `charOffset` values for chords are character indices into the line text. Double-check them against the actual lyric text if chords appear in wrong positions — adjust in the SQL and re-run `CREATE OR REPLACE FUNCTION`.
- Dollar-quoting (`$doc$...$doc$`) avoids all single-quote escaping headaches in the embedded JSON.
- The trigger only fires on new signups. Existing users need the backfill query from Task 3 Step 5.
