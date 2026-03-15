# GitHub Copilot Instructions for RiffNotes

RiffNotes is a React + TipTap + Supabase web app for annotating song lyrics with chords and performance notes.

---

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000 (Vite)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
```

> **No test script is defined in `package.json`.** Test files exist (`src/App.test.jsx`, `src/context/annotationReducer.test.js`, `src/context/LyricSheetContext.test.js`) and use Jest + React Testing Library, but there is no configured test runner — do not attempt to run `npm test`.

> **No linter is configured.** There is no ESLint or Prettier setup — do not run `npm run lint`.

---

## Environment

Copy `.env.example` → `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Variables are accessed via `import.meta.env.VITE_*` (Vite convention). The old `REACT_APP_*` names shown in `README.md` are stale — the correct names are the `VITE_` prefixed ones in `.env.example`.

---

## Architecture

### Two-layer data model

1. **TipTap document** (`useEditor`) — manages text structure: a `SongTitle` node followed by one or more `LyricLine` (paragraph) nodes. Persisted as TipTap JSON.
2. **AnnotationStore** (`LyricSheetContext` + `annotationReducer`) — a flat `{ [id]: annotation }` map in React Context. Annotations link to lines via `lineId`. Persisted alongside the document.

Both are stored in a single `songs` table row in Supabase PostgreSQL.

### Routing

| Route | Component | Guard |
|-------|-----------|-------|
| `/login` | `LoginPage` | — |
| `/` | `SongBrowser` | `ProtectedRoute` |
| `/songs/:id` | `SongEditor` | `ProtectedRoute` |
| `/admin` | `AdminPage` | `AdminRoute` |

`AuthContext.jsx` provides `user`, `loading`, `isAdmin`, `signInWithGoogle`, `signOut` via Supabase Google OAuth.

### How the editor layers connect

- `LyricLine.js` **must** extend TipTap's built-in `Paragraph` (node name stays `'paragraph'`). Creating a fresh node named `'paragraph'` causes infinite recursion in ProseMirror's `createAndFill`. Always use `Paragraph.extend({...})`.
- `StarterKit` is configured with `paragraph: false` and `heading: false` to avoid conflicts with the custom extensions.
- `AnnotatedLineView.jsx` is a React NodeView rendered for every paragraph. It reads the annotation store via `useLyricSheet()` and renders chord overlays (pixel-positioned via DOM Range) and right-side notes with leader lines.
- `AnnotationToolbar.jsx` is a BubbleMenu. Toolbar buttons use `onMouseDown` + `e.preventDefault()` to prevent editor blur before capturing `lineId`/`charOffset`.

### Data persistence

- `LyricSheetProvider` auto-saves to Supabase with a 1-second debounce via `requestSave()`.
- `saveStatus` (`'saved'` | `'saving'` | `'unsaved'`) is exposed in context and shown in the toolbar.
- `SongEditor` uses `key={id}` on the provider to force a full remount when switching songs.
- Image annotations are uploaded to Supabase Storage (`annotation-images` bucket) and stored as public URLs in the annotation JSON.

### Locked songs

- `is_locked` boolean on `songs` — locked songs cannot be edited or deleted.
- New users automatically receive a seeded example song via a Postgres trigger.
- When `isLocked` is true: editor is `editable: false`, BubbleMenu is hidden, saves are blocked, and "Example song" replaces the save indicator.

---

## TipTap v3 Import Paths

Always use these exact import paths (do **not** use `@tiptap/extension-bubble-menu` for `BubbleMenu`):

| Symbol | Import from |
|--------|-------------|
| `Node`, `Extension`, `mergeAttributes` | `@tiptap/core` |
| `ReactNodeViewRenderer`, `NodeViewWrapper`, `NodeViewContent`, `useEditor`, `EditorContent` | `@tiptap/react` |
| `BubbleMenu` | `@tiptap/react/menus` |
| `Plugin`, `PluginKey` | `@tiptap/pm/state` |
| `Decoration`, `DecorationSet` | `@tiptap/pm/view` |

Vite requires the `.jsx` extension for any file that contains JSX syntax.

---

## Annotation Types

All annotations live in `state.annotations` (flat map keyed by generated ID).

| `type` value | What it represents | Selector |
|---|---|---|
| `chord` | Chord label above a lyric at a character offset | `getChordsForLine(state, lineId)` |
| `right-side` | Performance note in the right column | `getRightNoteForLine(state, lineId)` |
| `image` | Image in the right column | `getImageForLine(state, lineId)` |

One line can have many chords but only one right-side annotation (note or image). Adding a new right-side annotation replaces the previous one for that line (`removeRightAnnotationsForLine`).

---

## Database Schema

Run migrations in order from the Supabase SQL editor:

1. `supabase/migration.sql` — `songs` table + RLS
2. `supabase/add_profiles_and_admin.sql` — `profiles` table, `is_admin()` helper function
3. `supabase/add_is_locked_and_example_song.sql` — `is_locked` column, example song trigger
4. `supabase/backfill.sql` / `supabase/backfill_profiles.sql` — for existing users

**`songs`**: `id` (uuid), `user_id`, `title`, `document` (jsonb), `annotations` (jsonb), `is_locked`, `created_at`, `updated_at`

**`profiles`**: `id` (uuid FK → auth.users), `is_admin`, `full_name`, `email`, `avatar_url`, `created_at`

`is_admin` can only be set via direct SQL — there are no client-side write policies for it.

---

## Design System

All visual tokens are in `src/styles/variables.css`.

| Token | Value |
|-------|-------|
| `--color-chord` | `#8217e7` |
| `--color-right-annotation` | `#8217e7` |
| `--font-annotations` | `'Montserrat', sans-serif` (not monospace) |
| `--font-size-lyrics` | `11px` |
| `--font-size-chord` | `10px` |
| `--line-height-lyrics` | `200%` |
| `--document-padding` | `25px` |

Song title is styled in `LyricEditor.css`: Blinker Bold 22px, color `#3F3F46`.

`.document-container` uses `zoom: 1.5` for screen readability; reset to `zoom: 1` in `@media print`.

---

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `Tab` | Song title | Jump to first lyric line |
| `Shift-Tab` | Any lyric line | Jump back to end of song title |
| `Enter` | Song title | Split into lyric line |
| `Alt-Shift-t` | Anywhere | Toggle song title node |

(`Mod-Shift-t` was avoided because it conflicts with Chrome on Windows.)

---

## Deployment

- Static SPA deployed to **Vercel**. `vercel.json` rewrites all routes to `index.html`.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel dashboard.
- Build output: `dist/`

---

## Code Review

When reviewing pull requests, **do not review or comment on any `.md` files**. Markdown documentation files should be completely ignored during code review — skip them entirely regardless of what changes they contain.

---

## Known Issues & Workarounds

- **`README.md` uses stale env var names** (`REACT_APP_SUPABASE_URL`, `npm start`) — the correct commands and variable names are in `CLAUDE.md` and `.env.example`. This file was not updated after the CRA → Vite migration.
- **No `npm test` script** — test files exist but the test runner (Vitest or Jest) has not been wired into `package.json`. Do not add or run tests unless the user explicitly asks you to set up testing.
- **No linter** — no ESLint or Prettier config is present. Follow the existing code style (2-space indent, single quotes, no trailing semicolons in some files — match the surrounding file's style).
- **No CI/CD pipeline** — there are no GitHub Actions workflows. Vercel auto-deploys on push to the connected branch.
- **`@heroui/react` is in beta** (`3.0.0-beta.8`) — component APIs may differ from stable docs.
