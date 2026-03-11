# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000 (Vite)
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build locally
```

## Architecture

RiffNotes is a lyrics annotation app with a **two-layer data model**:

1. **TipTap document** (via `useEditor`) — manages the text structure: lyric lines and song title.
2. **AnnotationStore** (`LyricSheetContext` + `annotationReducer`) — a flat `{ [id]: annotation }` map stored in React Context and persisted to Supabase. Annotations are linked to lines by `lineId`.

Both layers are stored in a single `songs` table in Supabase (PostgreSQL) with row-level security.

### Auth & routing

- **Supabase Auth** with Google OAuth — `AuthContext.js` provides `user`, `signInWithGoogle`, `signOut`
- **React Router v6** — three routes: `/login` (LoginPage), `/` (SongBrowser), `/songs/:id` (SongEditor)
- **ProtectedRoute** wraps authenticated routes and redirects to `/login`
- **GlobalToolbar** is a sticky header with app name/back link, children slot for actions, and user avatar/sign-out

### How layers connect

- `LyricLine.js` extends TipTap's built-in `Paragraph` (keeps node name `'paragraph'` — required for ProseMirror schema validity). It adds a `lineId` attribute that is auto-assigned on `onCreate` and on `Enter` keypress.
- `AnnotatedLineView.jsx` is a React NodeView rendered for every paragraph node. It reads the annotation store via `useLyricSheet()` and renders chord overlays (above text, pixel-positioned via DOM Range measurement) and right-side notes (with a dynamically-measured leader line). When `editingNote.lineId` matches, it shows an inline text input in the right column instead of the saved note.
- `AnnotationToolbar.jsx` is a BubbleMenu that appears on text selection (hidden in song title). Toolbar buttons use `onMouseDown` + `e.preventDefault()` to prevent editor blur, capture `lineId`/`charOffset` into a ref _before_ triggering input, then dispatch to the annotation store or call `startEditingNote()` from context.

### Data persistence

- `LyricSheetProvider` takes `songId`, `initialDocument`, `initialAnnotations`, and `isLocked` props from `SongEditor`
- Auto-saves to Supabase with 1-second debounce via `requestSave()` — called on annotation changes and editor `onUpdate`
- `saveStatus` state (`'saved'` | `'saving'` | `'unsaved'`) is exposed in context and shown in the toolbar
- Song title is extracted from the TipTap document JSON on each save for display in the song browser
- `SongEditor` uses `key={id}` on the provider to force full remount when switching songs
- **Image annotations** are stored in Supabase Storage (`annotation-images` bucket, public). Pasted images are uploaded via `supabase.storage.from('annotation-images').upload()` and stored as public URLs in the annotation JSON.

### Locked songs (example song)

- `is_locked` boolean column on `songs` table — locked songs cannot be edited or deleted
- New users receive a seeded example song via a Postgres trigger (`seed_example_song_trigger`)
- Existing users can be backfilled via `supabase/backfill.sql`
- When `isLocked` is true: editor is `editable: false`, BubbleMenu is hidden, annotation delete handlers are no-ops, saves are blocked, and "Example song" replaces the save indicator
- In SongBrowser: locked songs sort first, show a lock icon instead of delete button

### Database schema

Single `songs` table with RLS — migration in `supabase/migration.sql`:
- `id` (uuid), `user_id` (references auth.users), `title`, `document` (jsonb), `annotations` (jsonb), `is_locked` (boolean), `created_at`, `updated_at`
- Row-level security: users can only CRUD their own songs
- `updated_at` auto-updates via trigger
- Supabase Storage: `annotation-images` bucket (public) with INSERT/DELETE policies for authenticated users

### TipTap v3 import paths

| What | Import from |
|------|-------------|
| `Node`, `Extension`, `mergeAttributes` | `@tiptap/core` |
| `ReactNodeViewRenderer`, `NodeViewWrapper`, `NodeViewContent`, `useEditor`, `EditorContent` | `@tiptap/react` |
| Note: Vite requires `.jsx` extension for files containing JSX syntax | |
| `BubbleMenu` | `@tiptap/react/menus` (NOT `@tiptap/extension-bubble-menu`) |
| `Plugin`, `PluginKey` | `@tiptap/pm/state` |
| `Decoration`, `DecorationSet` | `@tiptap/pm/view` |

StarterKit is configured with `paragraph: false` and `heading: false` to avoid conflicts with the custom `LyricLine` and `SongTitle` extensions.

### Annotation types

All annotations live in `state.annotations` (flat map). Selectors in `annotationReducer.js` (`getChordsForLine`, `getRightNoteForLine`, `getImageForLine`) filter by `lineId` and `type`. Active types: `chord`, `right-side`, `image`.

### Key gotcha: LyricLine must extend Paragraph

Creating a new TipTap node named `paragraph` causes infinite recursion in ProseMirror's `createAndFill`. Always use `Paragraph.extend({...})`.

### Keyboard shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `Tab` | Song title | Jump to first lyric paragraph |
| `Shift-Tab` | Any lyric line | Jump back to end of song title |
| `Enter` | Song title | Split and convert to lyric paragraph |
| `Alt-Shift-t` | Anywhere | Toggle song title node (Mod-Shift-t conflicts with Chrome on Windows) |

### Design system

All visual tokens live in `src/styles/variables.css`. Key values:

| Token | Value | Notes |
|-------|-------|-------|
| `--color-chord` | `#8217e7` | Purple, same as right annotations |
| `--color-right-annotation` | `#8217e7` | |
| `--font-annotations` | `'Montserrat', sans-serif` | NOT monospace |
| `--font-size-lyrics` | `11px` | |
| `--font-size-chord` | `10px` | |
| `--line-height-lyrics` | `200%` | |
| `--document-padding` | `25px` | All sides |

Title is styled directly in `LyricEditor.css`: Blinker Bold 22px, color `#3F3F46`.

`.document-container` uses `zoom: 1.5` for screen readability. This is reset to `zoom: 1` in `@media print` so print layout is unaffected.

### Environment

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (Vite convention — `import.meta.env.VITE_*`)
- Deployed to Vercel as static SPA with `vercel.json` rewrite for client-side routing
- Build tool: Vite (migrated from CRA)
