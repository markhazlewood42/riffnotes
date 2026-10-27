---
type: project-doc
title: RiffNotes — Testing Strategy Design Spec
project: riffnotes
created: 2026-03-15
updated: 2026-08-26
tags: [design, testing]
---

# Testing Strategy Design

**Date:** 2026-03-15
**Status:** Approved

## Overview

A two-layer testing strategy for RiffNotes using **Vitest** (unit tests) and **Playwright** (end-to-end browser tests). The goal is to catch regressions in both the annotation data layer and the TipTap editor interaction layer before PRs are merged.

## Architecture

### Unit Tests — Vitest

Fast tests (~2s) for pure data logic. Vitest is used for native Vite integration and Jest-compatible API.

**Configuration:**
- `vitest.config.js` extending `vite.config.js` for alias/plugin consistency
- `environment: 'jsdom'`
- `globals: true` (provides `describe`/`test`/`expect` without explicit imports)
- `include: ['tests/**/*.test.{js,jsx}']`
- Script: `npm run test:unit` (single run), `npm run test:unit:watch` (dev mode)

**Test files** (in `tests/` directory, alongside `src/`):

**`tests/annotationReducer.test.js`** — rewrite of existing file:
- `ADD_CHORD` — creates chord with correct lineId, charOffset, value
- `ADD_CHORD` — multiple chords at same position coexist (reducer does not deduplicate)
- `ADD_RIGHT_NOTE` — creates right-side annotation
- `ADD_RIGHT_NOTE` — replaces existing right-side note on same line (via `removeRightAnnotationsForLine`)
- `ADD_RIGHT_NOTE` — replaces existing image annotation on same line
- `ADD_IMAGE` — creates image annotation, removes existing right-side notes on that line
- `ADD_IMAGE` — replaces existing image annotation on same line
- `UPDATE_ANNOTATION` — updates annotation fields (e.g., URL swap after image upload)
- `DELETE_ANNOTATION` — removes annotation by id
- `DELETE_ANNOTATIONS_FOR_LINE` — removes all annotations for a given lineId
- `REMAP_LINE_IDS` — remaps annotation lineIds via a mapping object
- `LOAD` — replaces full annotation state
- Selectors: `getChordsForLine`, `getRightNoteForLine`, `getImageForLine`, `getAnnotationsForLine` — correct filtering, empty results for missing lineIds

**`tests/computeStackedLayout.test.js`** — new, tests the stacking layout algorithm:
- Non-overlapping entries — no displacement, positions unchanged
- Consecutive overlapping entries — cascading push-down with `ANNOTATION_GAP` respected
- Gap in the middle resets the stack
- Single annotation — trivial case, no displacement
- Empty input — returns empty layout map

**`tests/pasteUtils.test.js`** — new, tests extracted paste text cleanup function:
- Multiple consecutive newlines collapse to single blank line
- Leading/trailing whitespace trimmed per line
- Non-empty lines preserved as array entries
- Empty input returns empty result
- Mixed content (some blank, some non-blank lines) handled correctly

**Removed files:**
- `src/App.test.jsx` — tested routing/auth rendering, low value with mocked Supabase/TipTap
- `src/context/LyricSheetContext.test.js` — thin wrapper over reducer, covered by reducer tests + e2e
- `src/context/annotationReducer.test.js` — moved to `tests/`

**Removed devDependencies:**
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` — no longer used once old test files are removed

### E2E Tests — Playwright

Browser tests against the dev server with auth bypass. Tests interact with a real TipTap editor in Chromium.

**Configuration:**
- `playwright.config.js` with `webServer` block: starts `VITE_AUTH_BYPASS=true npx vite --port 3002`
- Tests run against `http://localhost:3002/test`
- Chromium only (can add Firefox/WebKit later)
- Viewport: `1280 x 900` (consistent BubbleMenu positioning)
- Timeout: 30s per test
- Retries: 0 (fix flaky tests, don't mask them)
- Script: `npm run test:e2e`

**Test isolation:** Each test calls `resetEditor(page)` in a `beforeEach` hook, which calls `window.__TEST__.resetEditor()` and waits for the editor to settle (see "Async settling" below). This ensures no state leaks between tests.

**Supabase network calls:** Playwright route interception aborts all Supabase requests (`page.route('**/supabase.co/**', route => route.abort())`) to avoid slow timeouts and noisy console errors during tests.

**Test files** (in `e2e/` directory):

**`e2e/text-editing.spec.js`** — core editor behavior:
- Type lyrics into empty document, verify paragraphs created
- Press Enter to split a line, verify two separate paragraphs
- Backspace at start of line to merge with previous line
- Type into song title, Tab to jump to first lyric line
- Shift-Tab from lyrics to jump back to song title
- Enter in song title splits and creates lyric paragraph
- Bold and italic toggle via BubbleMenu

**`e2e/paste.spec.js`** — paste behavior:
- Paste plain text, verify line breaks preserved as separate paragraphs
- Paste plain text with multiple blank lines, verify collapsed to single blank line
- Paste rich HTML (bold, colors, font sizes), verify all formatting stripped
- Paste rich HTML, verify line breaks preserved
- Paste into middle of existing content, verify insertion point correct

**`e2e/chord-annotations.spec.js`** — chord workflow:
- Select text, open chord input via BubbleMenu, type chord, submit — verify chord appears above text
- Submit chord via Enter key — same result
- Cancel chord input via Escape — no chord added, BubbleMenu returns to buttons
- Add chord, then select new text — verify toolbar resets (not stuck in chord input mode)
- Delete a chord annotation

**`e2e/right-side-annotations.spec.js`** — right-side note workflow:
- Select text, click Note button, type note, submit — verify note appears in right column
- Verify leader line connects note to the correct lyric line
- Edit existing note — verify inline input appears with current value
- Delete a right-side annotation

**`e2e/annotation-stacking.spec.js`** — layout behavior:
- Load document with text annotations on consecutive lines, verify no visual overlap
- Load document with image annotations on consecutive lines, verify no visual overlap
- Mixed text + image annotations on adjacent lines verify correct stacking
- Displaced annotations have diagonal leader lines
- Adding an annotation triggers re-layout of surrounding annotations

**`e2e/image-annotations.spec.js`** — image paste into annotations:
- Paste image via synthetic `ClipboardEvent` with a `DataTransferItem` containing a small PNG blob (created in `page.evaluate()`)
- Image annotation replaces right-side text note on same line

**`e2e/helpers.js`** — shared test utilities:
- `resetEditor(page)` — calls `window.__TEST__.resetEditor()`, waits for settle
- `setDocument(page, doc)` — injects specific document state, waits for settle
- `setAnnotations(page, annotations)` — injects annotation state, waits for settle
- `selectText(page, text)` — calls `window.__TEST__.selectText(text)` which uses TipTap's `editor.chain().setTextSelection()` to reliably select text in contenteditable without mouse coordinate math
- `getEditorContent(page)` — reads current document state via `window.__TEST__.getState()`
- `getAnnotations(page)` — reads current annotation state via `window.__TEST__.getState()`

### Test State Injection API

Changes to `src/pages/TestEditor.jsx` to support programmatic control from Playwright tests.

**`window.__TEST__` API** (exposed only when `VITE_AUTH_BYPASS=true`):
- `setDocument(doc)` — replaces TipTap editor content, returns promise that resolves after TipTap `update` event fires
- `setAnnotations(annotations)` — dispatches `LOAD` action to replace annotation state, returns settled promise
- `resetEditor()` — sets editor to empty document (title + one blank paragraph), clears all annotations, returns settled promise
- `selectText(text)` — finds text in the document and sets TipTap selection range via `editor.chain().setTextSelection()`, returns promise
- `getState()` — returns `{ document: editor.getJSON(), annotations, editingNote }`
- `ready` — promise that resolves when editor is fully mounted

**Async settling:** All mutation methods (`setDocument`, `setAnnotations`, `resetEditor`) return a promise that resolves after the next TipTap `update` event and a `requestAnimationFrame`, ensuring the DOM has settled before Playwright proceeds. E2e helpers wrap each call with `page.evaluate()` + `page.waitForFunction()` as a belt-and-suspenders check.

The API is wired in a `useEffect` inside `TestEditor.jsx` using refs to editor and dispatch. No changes to production code — injection layer lives entirely in the test component.

### Source Changes

**New file: `src/editor/pasteUtils.js`**
- Extract the text normalization step from `LyricEditor.jsx`'s `handlePaste`: collapsing newlines and splitting into lines
- Only the pure text→lines logic is extracted; ProseMirror node construction stays in `handlePaste`
- `LyricEditor.jsx` imports and calls the extracted function

**Export `computeStackedLayout` for testing:**
- `src/hooks/useAnnotationLayout.js` already exports `computeStackedLayout` — verify it is a named export so `tests/computeStackedLayout.test.js` can import it directly

## Project Structure

```
riffnotes/
├── e2e/
│   ├── helpers.js
│   ├── text-editing.spec.js
│   ├── paste.spec.js
│   ├── chord-annotations.spec.js
│   ├── right-side-annotations.spec.js
│   ├── annotation-stacking.spec.js
│   └── image-annotations.spec.js
├── tests/
│   ├── annotationReducer.test.js
│   ├── computeStackedLayout.test.js
│   └── pasteUtils.test.js
├── src/
│   ├── editor/
│   │   └── pasteUtils.js               (extracted)
│   ├── pages/
│   │   └── TestEditor.jsx              (+ __TEST__ API)
│   └── ...
├── vitest.config.js
├── playwright.config.js
└── package.json
```

## npm Scripts

```json
{
  "test": "vitest run && playwright test",
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:e2e": "playwright test"
}
```

## Installation

```bash
npm install -D vitest @playwright/test --legacy-peer-deps
npx playwright install chromium
npm uninstall @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## Design Decisions

- **Vitest over Jest**: Native Vite integration, same transform pipeline, no extra config for JSX/imports.
- **Playwright over Cypress**: Better keyboard/mouse simulation for contenteditable editors, faster execution, built-in auto-waiting.
- **Chromium only**: Reduces test time. RiffNotes users are primarily on Chrome. Can add browsers later.
- **No retries**: Flaky tests indicate real timing/race issues that should be fixed.
- **`/test` route reuse**: Avoids duplicating editor setup. Programmatic state injection gives each test independence.
- **Extracted `pasteUtils.js`**: Makes paste logic unit-testable without spinning up a browser.
- **`tests/` alongside `src/`**: Keeps test files separate from production source, easy to find and manage.
- **`selectText` via TipTap API**: Uses `editor.chain().setTextSelection()` rather than mouse-based selection to avoid brittle coordinate math in contenteditable.
- **Abort Supabase requests**: Prevents slow timeouts and noisy errors without requiring a mock server.

## Future Work

- **CI pipeline**: GitHub Actions workflow to run `npm test` on PRs (requires `npx playwright install --with-deps chromium` in CI). Not in scope for this spec.
- **Auth/routing e2e tests**: Login flow, song CRUD, song browser, admin page. Requires Supabase network mocking or a test database.
- **Page break e2e tests**: Verify spacer widgets appear when content exceeds page boundaries. Deferred since page break behavior is stable and rarely changes.
- **Line merge annotation cleanup e2e tests**: Verify annotations are cleaned up when lines are merged via backspace. Can add once the annotation-on-line-delete behavior is exercised more.
- **Additional browsers**: Firefox and WebKit in Playwright config.
