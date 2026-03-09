# Design: Example Song Onboarding

**Date:** 2026-03-09
**Status:** Approved

## Goal

Every new user starts with a pre-seeded example song that demonstrates all annotation types (chords, right-side notes, image annotations) and includes inline instructions for how to use each feature.

## Database Changes

### Migration

```sql
ALTER TABLE songs ADD COLUMN is_locked boolean NOT NULL DEFAULT false;
```

### Trigger

A PostgreSQL trigger function fires `AFTER INSERT ON auth.users`. It runs as `SECURITY DEFINER` to bypass RLS and inserts one row into `songs`:

- `user_id = NEW.id`
- `is_locked = true`
- `title = 'Knockin\' on Heaven\'s Door'`
- `document` = hardcoded TipTap JSON (see below)
- `annotations` = hardcoded annotations JSON (see below)

The trigger is created in a new migration file: `supabase/add_is_locked_and_example_song.sql`

## Example Song Content

**Song:** "Knockin' on Heaven's Door" — verse 1 + chorus (Bob Dylan)

### Document JSON

Standard TipTap/ProseMirror format:
```json
{
  "type": "doc",
  "content": [
    { "type": "songTitle", "content": [{ "type": "text", "text": "Knockin' on Heaven's Door" }] },
    { "type": "paragraph", "attrs": { "lineId": "line-seed-1" }, "content": [{ "type": "text", "text": "Mama, take this badge off of me" }] },
    ...
  ]
}
```

LineIds use stable hardcoded values (`"line-seed-1"` through `"line-seed-N"`) so annotations can reference them reliably.

### Annotations JSON

```json
{
  "ann-seed-1": { "id": "ann-seed-1", "type": "chord", "lineId": "line-seed-1", "charOffset": 0, "text": "G" },
  "ann-seed-2": { "id": "ann-seed-2", "type": "chord", "lineId": "line-seed-1", "charOffset": 7, "text": "D" },
  "ann-seed-3": { "id": "ann-seed-3", "type": "chord", "lineId": "line-seed-2", "charOffset": 2, "text": "Am" },
  "ann-seed-4": { "id": "ann-seed-4", "type": "chord", "lineId": "line-seed-2", "charOffset": 10, "text": "C" },
  "ann-seed-5": { "id": "ann-seed-5", "type": "right-side", "lineId": "line-seed-1", "text": "👆 Select any word, then tap chord in the popup toolbar to add a chord like these" },
  "ann-seed-6": { "id": "ann-seed-6", "type": "right-side", "lineId": "line-seed-4", "text": "🎵 softly — build into chorus" },
  "ann-seed-7": { "id": "ann-seed-7", "type": "image", "lineId": "line-seed-6", "dataUrl": "<base64 provided by user>" },
  "ann-seed-8": { "id": "ann-seed-8", "type": "right-side", "lineId": "line-seed-7", "text": "👆 Select a line and tap image in the toolbar, or paste from clipboard (⌘V / Ctrl+V)" }
}
```

### Image

User provides a staff notation PNG/JPG. It is base64-encoded and embedded directly as `dataUrl` in the image annotation. No external storage required.

## SongBrowser Changes

- Add `is_locked` to the Supabase select query in `SongBrowser.jsx`
- On cards where `is_locked === true`: render a `<Lock size={14} />` icon (lucide-react) in place of the delete button
- The lock icon is non-interactive (no click handler, `cursor: default`)

## What Does NOT Change

- `SongEditor` — the song opens and edits normally; `is_locked` has no effect inside the editor
- Delete endpoint — client-side prevention is sufficient for alpha; server-side enforcement can be added later
- No new React context, no new routes

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/add_is_locked_and_example_song.sql` | New migration: ALTER TABLE + trigger function + trigger |
| `src/pages/SongBrowser.jsx` | Add `is_locked` to select, render Lock icon on locked cards |
| `src/pages/SongBrowser.css` | Style the lock icon to match delete button position/size |
