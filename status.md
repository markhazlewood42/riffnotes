# RiffNotes

Lyrics annotation app — add structured annotations to song lyrics (chords, notes, performance cues).

## Architecture

- **Stack**: React + Vite, TipTap editor, Supabase (auth + Postgres), Tailwind CSS v4, HeroUI v3
- **Data model**: Two-layer — TipTap document for text structure, AnnotationStore for annotation data
- **Auth**: Supabase Auth with Google OAuth
- **Repo**: `projects/riffnotes/` → https://github.com/markhazlewood42/riffnotes.git

## Current Status

Alpha — released to friends for testing.

### Recently shipped
- **Set lists** (2026-03-29) — group songs into ordered set lists with create/rename/delete, add/remove songs, drag-to-reorder. Dropdown filter on SongBrowser, vertical list view for set list songs. PR #35.
- **Interactive onboarding** (2026-03-30, `feature/onboarding`) — `is_example` column decouples practice song identity from `is_locked`; WelcomeModal on first SongBrowser visit; 3-step React Joyride tour on example song. E2E: 13 new tests (26 assertions across Chromium + Firefox), all passing. DB migration (`supabase/add_is_example.sql`) still needs to be run in Supabase SQL Editor before merging.

## Future Plans

<!-- Backlog / ideas -->

## Notes

- Dev server: `npm run dev` (port 3000)
- Auth bypass for testing: `VITE_AUTH_BYPASS=true`
- Playwright for E2E tests
