# AGENTS.md — RiffNotes

Lyrics annotation app — add structured annotations (chords, notes, performance cues) to song lyrics. Alpha release, actively developed.

## Tech Stack

React 19 + Vite + TipTap 3 (rich text editor) + Supabase (Auth + PostgreSQL) + Tailwind CSS v4 + HeroUI v3 beta + Lucide React icons.

## Key Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Full architecture guide with gotchas |
| `status.md` | Current sprint status and in-progress work |
| `src/contexts/LyricSheetContext.jsx` | AnnotationStore (flat map) + annotationReducer |
| `src/contexts/AuthContext.jsx` | Supabase Auth provider |
| `src/components/SongEditor/` | Main editor view (TipTap + annotations) |
| `src/components/SongBrowser/` | Song list / home page |
| `src/components/GlobalToolbar/` | Sticky header with nav and user menu |
| `src/extensions/` | Custom TipTap extensions (LyricLine, SongTitle) |
| `src/hooks/useAnnotationLayout.js` | Annotation stacking / overlap prevention |
| `src/styles/variables.css` | Design tokens (purple accent, fonts) |
| `supabase/` | SQL migrations |
| `tests/` | Playwright E2E tests |

## Architecture Summary

Two-layer data model:
1. **TipTap document** — text structure (lyric lines, song title)
2. **AnnotationStore** — flat `{ [id]: annotation }` map in React Context, persisted to Supabase `songs.annotations` JSONB column

Both stored in a single `songs` table with row-level security.

## Current State

Alpha — released to friends for testing. Active feature development. See `status.md` for current sprint.
