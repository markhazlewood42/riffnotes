# RiffNotes

Lyrics annotation app — add structured annotations to song lyrics (chords, notes, performance cues).

## Architecture

- **Stack**: React + Vite, TipTap editor, Supabase (auth + Postgres), Tailwind CSS v4, HeroUI v3
- **Data model**: Two-layer — TipTap document for text structure, AnnotationStore for annotation data
- **Auth**: Supabase Auth with Google OAuth
- **Repo**: `projects/riffnotes/` → https://github.com/markhazlewood42/riffnotes.git

## Current Status

Alpha — released to friends for testing.

### In progress
- **Interactive onboarding** (`feature/onboarding`, pushed 2026-03-31) — feature is complete and tested locally; pending PR and merge.
  - `is_example` column decouples practice song identity from `is_locked`
  - WelcomeModal on first SongBrowser visit (with "Open practice song" CTA)
  - 3-step React Joyride tour on example song (no beacons, scroll-locked, tight spotlight targets)
  - Avatar+username in GlobalToolbar is now a dropdown menu with "RiffNotes walkthrough" (resets both flags + reopens WelcomeModal) and "Sign out"
  - `--radius-dropdown` CSS variable applied globally to all dropdowns
  - E2E: 24 tests (Chromium + Firefox), all passing
  - **DB migration still needs to be run** in Supabase SQL Editor: `supabase/add_is_example.sql`
  - **Next**: open PR, run migration in production, merge

### Recently shipped
- **Set lists** (2026-03-29) — group songs into ordered set lists with create/rename/delete, add/remove songs, drag-to-reorder. Dropdown filter on SongBrowser, vertical list view for set list songs. PR #35.

## Future Plans

<!-- Backlog / ideas -->

## Notes

- Dev server: `npm run dev` (port 3000)
- Auth bypass for testing: `VITE_AUTH_BYPASS=true`
- Playwright for E2E tests
