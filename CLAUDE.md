# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000 (Vite)
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build locally
npm run lint:css # Check CSS for cross-browser compatibility
```

## Architecture

RiffNotes is a lyrics annotation app with a **two-layer data model**:

1. **TipTap document** (via `useEditor`) — manages the text structure: lyric lines and song title.
2. **AnnotationStore** (`LyricSheetContext` + `annotationReducer`) — a flat `{ [id]: annotation }` map stored in React Context and persisted to Supabase. Annotations are linked to lines by `lineId`.

Both layers are stored in a single `songs` table in Supabase (PostgreSQL) with row-level security.

### Auth & routing

- **Supabase Auth** with Google OAuth — `AuthContext.jsx` provides `user`, `loading`, `isAdmin`, `signInWithGoogle`, `signOut`
- **React Router v6** — routes: `/login` (LoginPage), `/` (SongBrowser), `/songs/:id` (SongEditor), `/admin` (AdminPage, admin only)
- **ProtectedRoute** wraps authenticated routes and redirects to `/login`
- **AdminRoute** wraps admin routes, redirects non-admins to `/`
- **GlobalToolbar** is a sticky header with app name (links to `/`), alpha chip, admin link (shield icon, admin only), and user avatar/sign-out

### How layers connect

- `LyricLine.js` extends TipTap's built-in `Paragraph` (keeps node name `'paragraph'` — required for ProseMirror schema validity). It adds a `lineId` attribute that is auto-assigned on `onCreate` and on `Enter` keypress.
- `AnnotatedLineView.jsx` is a React NodeView rendered for every paragraph node. It reads the annotation store via `useLyricSheet()` and renders chord overlays (above text, pixel-positioned via DOM Range measurement) and right-side notes (with a dynamically-measured leader line). When `editingNote.lineId` matches, it shows an inline text input in the right column instead of the saved note.
- `AnnotationToolbar.jsx` is a BubbleMenu that appears on text selection (hidden in song title). Toolbar buttons use `onMouseDown` + `e.preventDefault()` to prevent editor blur, capture `lineId`/`charOffset` into a ref _before_ triggering input, then dispatch to the annotation store or call `startEditingNote()` from context.

### Annotation stacking (layout coordinator)

Right-column annotations are prevented from overlapping by a layout coordinator:

- `useAnnotationLayout` hook (`src/hooks/useAnnotationLayout.js`) measures line element DOM positions, computes stacked layout via `computeStackedLayout()`, and writes a `layoutMap` to context via `setLayoutMap`.
- `SongEditorInner` wires the hook: `useAnnotationLayout(bodyRef, state.annotations, editingNote, setLayoutMap)`.
- `AnnotatedLineView` reads `layoutMap[lineId]` for `{ top, height, displacement, lineTop }` and applies `annotationTopOffset = layout.top - layout.lineTop` as CSS `top` on the annotation wrapper.
- Leader lines are SVG-based dashed lines. Non-displaced: horizontal. Displaced: horizontal-then-diagonal elbow (bend point at `BEND_INSET` px from column divider, line extends `LEADER_OVERSHOOT` px past divider).
- Leader container uses `height: 0; overflow: visible` so annotations never affect lyric line spacing.
- Named constants in `useAnnotationLayout.js`: `ANNOTATION_GAP` (10px), `BEND_INSET` (12px), `LEADER_OVERSHOOT` (10px).

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

Two tables with RLS:

**`songs`** — migration in `supabase/migration.sql`:
- `id` (uuid), `user_id` (references auth.users), `title`, `document` (jsonb), `annotations` (jsonb), `is_locked` (boolean), `created_at`, `updated_at`
- Row-level security: users can CRUD their own songs; admins can SELECT all songs
- `updated_at` auto-updates via trigger
- Supabase Storage: `annotation-images` bucket (public) with INSERT/DELETE policies for authenticated users

**`profiles`** — migration in `supabase/add_profiles_and_admin.sql`:
- `id` (uuid, FK to auth.users), `is_admin` (boolean), `full_name`, `email`, `avatar_url`, `created_at`
- Auto-created via `on_auth_user_created_profile` trigger (copies Google OAuth metadata)
- `is_admin(uid)` SQL helper function (SECURITY DEFINER) used in RLS policies
- Row-level security: users can SELECT own profile; admins can SELECT all profiles
- `is_admin` is only changed via direct SQL — no client-side write policies

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

### Key gotcha: paste into songTitle requires inline-text insertion

Our custom paste handler in `LyricEditor.jsx` calls `replaceSelection` with paragraph nodes. If the cursor is inside the `songTitle` node, ProseMirror's schema fit will replace the title node itself (setting `titleCount` to 0 and breaking the document). Always detect `$from.parent.type.name === 'songTitle'` before pasting and insert only the first line as inline text via `tr.insertText()`.

### Key gotcha: Backspace at first lyric / ArrowUp into title need explicit handlers

- **Backspace at start of first lyric** — TipTap's default merges the paragraph into `songTitle`, corrupting the node. `LyricLine.js` blocks this with a `Backspace` handler that returns `true` when the cursor is at position 0 of the first lyric paragraph.
- **ArrowUp from first lyric on Firefox** — The `SongTitleView` NodeView contains a `contentEditable={false}` element (`InstrumentTags`), which Firefox treats as an atomic cursor object, causing ArrowUp to skip the title entirely. `LyricLine.js` has an explicit `ArrowUp` handler that sets the cursor to the end of the title when at position 0 of the first lyric paragraph, making behavior consistent across browsers.

### Key gotcha: Playwright clipboard testing

- **Never use synthetic `ClipboardEvent` dispatch** — Firefox's `ClipboardEvent` constructor ignores `clipboardData`, so `clipboardData` comes back null and paste never fires. Always use `navigator.clipboard.writeText()` + `ControlOrMeta+v` (native clipboard path) via the `pasteText()` helper in `e2e/helpers.js`.
- **`clipboard-read`/`clipboard-write` permissions are Chromium-only** — adding them to the global Playwright config crashes Firefox tests. Scope clipboard permissions to the Chromium project only in `playwright.config.js`.
- **Windows clipboard line endings** — Chrome's native clipboard returns `\r\n`. Normalize to `\n` in `pasteUtils.js` before processing, otherwise regexes like `\n{3,}` won't match and blank-line collapsing breaks.

### Key gotcha: contentEditable={false} in NodeViews breaks Firefox arrow-key navigation

Firefox treats `contenteditable="false"` elements inside a `contenteditable="true"` region as atomic cursor objects (like embedded images). Any such element — even zero-height — causes ArrowUp/Down to skip over it, making cursor navigation jump unexpectedly.

**Rule:** Never render an empty `contentEditable={false}` element unconditionally inside a NodeView. In `AnnotatedLineView`, both `right-annotation-column` and `leader-line-container` are guarded by `{showRightColumn && ...}` so they're absent when a line has no annotations. Use a CSS `::after` pseudo-element on the flex container to reserve layout space instead — pseudo-elements can't be `contentEditable` so Firefox ignores them for cursor navigation.

### Keyboard shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `Tab` | Song title | Jump to first lyric paragraph |
| `Shift-Tab` | Any lyric line | Jump back to end of song title |
| `Enter` | Song title | Split and convert to lyric paragraph |
| `Alt-Shift-t` | Anywhere | Toggle song title node (Mod-Shift-t conflicts with Chrome on Windows) |
| `ArrowUp` | First lyric paragraph | Move cursor to end of song title (explicit handler for Firefox compat) |
| `Backspace` | Start of first lyric paragraph | No-op — blocked to prevent merging into song title |

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

`.document-container` zoom is computed in JS via `useDocumentZoom` hook (`src/hooks/useDocumentZoom.js`) and applied as an inline `zoom` style with a plain number. **Firefox doesn't support `min()`/viewport units inside CSS `zoom`**, so dynamic zoom must always be computed in JS, not in a CSS custom property. The `stylelint` config warns on CSS `zoom` usage to catch this. Reset to `zoom: 1` in `@media print`.

### Environment

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (Vite convention — `import.meta.env.VITE_*`)
- Deployed to Vercel as static SPA with `vercel.json` rewrite for client-side routing
- Build tool: Vite (migrated from CRA)
- **Killing Windows processes**: `taskkill /PID ... /F` fails in MINGW64 bash (Git Bash intercepts `/PID` as a path). Use `cmd //c "taskkill /PID 1234 /F"` instead.
- **Reading Copilot PR reviews**: `gh pr view <N> --comments` shows the summary; `gh api repos/OWNER/REPO/pulls/<N>/comments` shows inline suggestions with file/line context.
- **Session handoff**: cross-session context is captured in `session-YYYY-MM-DD.md` at repo root. Read it at session start to pick up where the previous session left off.
