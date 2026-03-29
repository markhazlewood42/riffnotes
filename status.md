# RiffNotes

Lyrics annotation app — add structured annotations to song lyrics (chords, notes, performance cues).

## Architecture

- **Stack**: React + Vite, TipTap editor, Supabase (auth + Postgres), Tailwind CSS v4, HeroUI v3
- **Data model**: Two-layer — TipTap document for text structure, AnnotationStore for annotation data
- **Auth**: Supabase Auth with Google OAuth
- **Repo**: `projects/riffnotes/` → https://github.com/markhazlewood42/riffnotes.git

## Current Status

Alpha — released to friends for testing.

## Future Plans

<!-- Backlog / ideas -->

## Notes

- Dev server: `npm run dev` (port 3000)
- Auth bypass for testing: `VITE_AUTH_BYPASS=true`
- Playwright for E2E tests
