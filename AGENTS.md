# AGENTS.md — RiffNotes

Lyrics annotation app — add structured annotations (chords, notes, performance cues) to song lyrics. Alpha release, released to friends. Dormant since 2026-05-26; onboarding work is pending on `feature/onboarding`.

## Tech Stack

React 19 + Vite + TipTap 3 (rich text editor) + Supabase (Auth + PostgreSQL + Storage) + Tailwind CSS v4 + HeroUI v3 beta + Lucide React icons. Deployed on Vercel (static SPA plus `api/genius-search.js`).

## Key Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Full architecture guide with gotchas |
| `status.md` | Current status, in-progress work, open issues |
| `src/context/LyricSheetContext.jsx` | AnnotationStore (flat map) provider + auto-save |
| `src/context/annotationReducer.js` | Annotation reducer and selectors |
| `src/context/AuthContext.jsx` | Supabase Auth provider |
| `src/context/ThemeContext.jsx` | Light/dark theme |
| `src/pages/` | `SongBrowser`, `SongEditor`, `LoginPage`, `AdminPage`, `TestEditor` |
| `src/components/` | `GlobalToolbar`, `FindSongModal`, `Setlist*`, `AddSongsModal`, `InstrumentTags`, `WelcomeModal`, `OnboardingTour` |
| `src/editor/` | TipTap editor: `LyricEditor.jsx`, `extensions/` (LyricLine, SongTitle, PageBreaks, WordHover), `nodeviews/` (AnnotatedLineView, SongTitleView), `pageLayout.js`, `pasteUtils.js` |
| `src/toolbar/` | Annotation bubble menu and inputs |
| `src/hooks/useAnnotationLayout.js` | Annotation stacking / overlap prevention |
| `src/services/` | `setlists.js`, `lrclib.js`, `songDocument.js` |
| `src/styles/variables.css` | Design tokens (purple accent, fonts) |
| `supabase/` | SQL migrations |
| `tests/` | Vitest unit tests |
| `e2e/` | Playwright E2E tests |

## Architecture Summary

Two-layer data model:
1. **TipTap document** — text structure (lyric lines, song title)
2. **AnnotationStore** — flat `{ [id]: annotation }` map in React Context, persisted to Supabase `songs.annotations` JSONB column

Both stored in a single `songs` table with row-level security.

## Current State

Alpha — released to friends for testing. See `status.md` for in-progress work, the pending production migration, and open issues.
