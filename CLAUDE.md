# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # Dev server at http://localhost:3000
npm run build    # Production build
npm test         # Run tests (Jest via react-scripts)
npm test -- --testPathPattern=<file>  # Run a single test file
```

No linter is explicitly configured beyond the default `react-app` ESLint config in `package.json`.

## Architecture

GigNotes is a lyrics annotation app with a **two-layer data model**:

1. **TipTap document** (via `useEditor`) — manages the text structure: lyric lines, song title, section markers, repeat refs.
2. **AnnotationStore** (`LyricSheetContext` + `annotationReducer`) — a flat `{ [id]: annotation }` map stored in React Context and persisted to `localStorage` under key `gignotes-data`. Annotations are linked to lines by `lineId`.

### How layers connect

- `LyricLine.js` extends TipTap's built-in `Paragraph` (keeps node name `'paragraph'` — required for ProseMirror schema validity). It adds a `lineId` attribute that is auto-assigned on `onCreate` and on `Enter` keypress.
- `AnnotatedLineView.jsx` is a React NodeView rendered for every paragraph node. It reads the annotation store via `useLyricSheet()` and renders chord overlays (above text, positioned with `ch` units) and right-side notes (with a dynamically-measured leader line).
- `AnnotationToolbar.jsx` is a BubbleMenu that appears on text selection. Toolbar buttons use `onMouseDown` + `e.preventDefault()` to prevent editor blur, capture `lineId`/`charOffset` into a ref _before_ rendering an input component, then dispatch to the annotation store.

### TipTap v3 import paths

| What | Import from |
|------|-------------|
| `Node`, `Extension`, `mergeAttributes` | `@tiptap/core` |
| `ReactNodeViewRenderer`, `NodeViewWrapper`, `NodeViewContent`, `useEditor`, `EditorContent` | `@tiptap/react` |
| `BubbleMenu` | `@tiptap/react/menus` (NOT `@tiptap/extension-bubble-menu`) |
| `Plugin`, `PluginKey` | `@tiptap/pm/state` |
| `Decoration`, `DecorationSet` | `@tiptap/pm/view` |

StarterKit is configured with `paragraph: false` and `heading: false` to avoid conflicts with the custom `LyricLine` and `SongTitle` extensions.

### Annotation types

All annotations live in `state.annotations` (flat map). Selectors in `annotationReducer.js` (`getChordsForLine`, `getRightNoteForLine`, etc.) filter by `lineId` and `type`. Types: `chord`, `right-side`, `sticking`, `counting`.

### Key gotcha: LyricLine must extend Paragraph

Creating a new TipTap node named `paragraph` causes infinite recursion in ProseMirror's `createAndFill`. Always use `Paragraph.extend({...})`.

### Keyboard shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `Tab` | Song title | Jump to first lyric paragraph |
| `Shift-Tab` | Any lyric line | Jump back to end of song title |
| `Enter` | Song title | Split and convert to lyric paragraph |
| `Mod-Shift-t` | Anywhere | Toggle song title node |

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

`.document-container` uses `zoom: 1.5` for screen readability. This is reset to `zoom: 1` in `@media print` so print layout is unaffected. The TipTap document is **not persisted** — only annotations survive page reload (stored in `localStorage` under `gignotes-data`).
