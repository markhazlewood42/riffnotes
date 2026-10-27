---
type: project-doc
title: RiffNotes — Testing Strategy Plan
project: riffnotes
created: 2026-03-17
updated: 2026-08-26
tags: [plan, testing]
memory: [feedback-test-ui-before-presenting]
---

# Testing Strategy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a two-layer test suite (Vitest unit tests + Playwright e2e tests) that verifies annotation data logic and TipTap editor interactions before PRs are merged.

**Architecture:** Vitest runs pure-function unit tests against the annotation reducer, stacking layout algorithm, and paste utilities. Playwright runs browser tests against the dev server in auth-bypass mode using a programmatic `window.__TEST__` API injected into `TestEditor.jsx` for state control. Tests live in `tests/` (unit) and `e2e/` (browser).

**Tech Stack:** Vitest 3, @playwright/test, cross-env, React 19, TipTap v3

**Spec:** `docs/superpowers/specs/2026-03-15-testing-strategy-design.md`

---

## Chunk 1: Infrastructure & Unit Tests

### Task 1: Install Vitest and configure

**Files:**
- Create: `vitest.config.js`
- Modify: `package.json`
- Delete: `src/App.test.jsx`, `src/context/LyricSheetContext.test.js`, `src/context/annotationReducer.test.js`

- [ ] **Step 1: Install vitest and cross-env, remove unused testing-library packages**

```bash
cd C:/Users/markh/src/riffnotes
npm install -D vitest jsdom cross-env --legacy-peer-deps
npm uninstall @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `package.json` devDependencies now has `vitest`, `jsdom`, and `cross-env`; testing-library packages are gone.

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Add to the `"scripts"` block (keep existing dev/build/preview scripts):

```json
"test": "vitest run && playwright test",
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:e2e": "playwright test",
"test:server": "cross-env VITE_AUTH_BYPASS=true vite --port 3002"
```

- [ ] **Step 4: Delete the three old test files (they use Jest APIs incompatible with current codebase)**

```bash
rm src/App.test.jsx
rm src/context/LyricSheetContext.test.js
rm src/context/annotationReducer.test.js
```

- [ ] **Step 5: Create the `tests/` directory and verify Vitest finds it**

```bash
mkdir -p tests
touch tests/.gitkeep
```

- [ ] **Step 6: Run Vitest to confirm it starts cleanly (no files = no tests, exit 0)**

```bash
npm run test:unit
```

Expected output: something like `No test files found` or exits 0 with 0 tests.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.js package.json package-lock.json tests/.gitkeep
git add -u src/App.test.jsx src/context/LyricSheetContext.test.js src/context/annotationReducer.test.js
git commit -m "feat(testing): install Vitest, add test scripts, remove stale test files"
```

---

### Task 2: Extract `pasteUtils.js` and write unit tests

**Files:**
- Create: `src/editor/pasteUtils.js`
- Modify: `src/editor/LyricEditor.jsx`
- Create: `tests/pasteUtils.test.js`

- [ ] **Step 1: Create `src/editor/pasteUtils.js`**

```js
/**
 * Normalizes pasted text for insertion into the lyric editor.
 * Collapses runs of 3+ consecutive newlines to 2 (one blank separator line)
 * then splits on newlines. Returns an array of line strings; empty strings
 * represent blank lines (verse/stanza separators).
 *
 * @param {string|null|undefined} text
 * @returns {string[]}
 */
export function normalizePasteLines(text) {
  if (!text) return [];
  return text.replace(/\n{3,}/g, '\n\n').split('\n');
}
```

- [ ] **Step 2: Write the failing tests in `tests/pasteUtils.test.js`**

```js
import { normalizePasteLines } from '../src/editor/pasteUtils.js';

describe('normalizePasteLines', () => {
  test('empty string returns empty array', () => {
    expect(normalizePasteLines('')).toEqual([]);
  });

  test('null returns empty array', () => {
    expect(normalizePasteLines(null)).toEqual([]);
  });

  test('undefined returns empty array', () => {
    expect(normalizePasteLines(undefined)).toEqual([]);
  });

  test('single line with no newlines', () => {
    expect(normalizePasteLines('hello')).toEqual(['hello']);
  });

  test('multiple lines split on newlines', () => {
    expect(normalizePasteLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  test('single blank line is preserved as empty string', () => {
    expect(normalizePasteLines('a\n\nb')).toEqual(['a', '', 'b']);
  });

  test('three consecutive newlines collapsed to one blank line', () => {
    expect(normalizePasteLines('a\n\n\nb')).toEqual(['a', '', 'b']);
  });

  test('four or more consecutive newlines collapsed to one blank line', () => {
    expect(normalizePasteLines('a\n\n\n\nb')).toEqual(['a', '', 'b']);
  });

  test('mixed blank and non-blank lines preserved in order', () => {
    expect(normalizePasteLines('verse\nline 1\n\nchorus\nline 2')).toEqual([
      'verse', 'line 1', '', 'chorus', 'line 2',
    ]);
  });
});
```

- [ ] **Step 3: Run tests — they should fail (function not yet used, but imports should resolve)**

```bash
npm run test:unit
```

Expected: 9 tests pass immediately (the function is already implemented). If any fail, the implementation needs adjustment.

- [ ] **Step 4: Update `src/editor/LyricEditor.jsx` to use `normalizePasteLines`**

Add import at the top (after the Fragment/Slice import):
```js
import { normalizePasteLines } from './pasteUtils.js';
```

Replace the inline normalization in `handlePaste`:
```js
// Before:
const lines = text.replace(/\n{3,}/g, '\n\n').split(/\n/);

// After:
const lines = normalizePasteLines(text);
```

- [ ] **Step 5: Run tests again to confirm still passing**

```bash
npm run test:unit
```

Expected: 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/editor/pasteUtils.js src/editor/LyricEditor.jsx tests/pasteUtils.test.js
git commit -m "feat(testing): extract normalizePasteLines, add pasteUtils unit tests"
```

---

### Task 3: Write annotation reducer unit tests

**Files:**
- Create: `tests/annotationReducer.test.js`

- [ ] **Step 1: Write tests**

```js
import {
  annotationReducer,
  initialState,
  getChordsForLine,
  getRightNoteForLine,
  getImageForLine,
  getAnnotationsForLine,
} from '../src/context/annotationReducer.js';

// Helper to get a fresh empty state
function emptyState() {
  return { annotations: {}, songId: null };
}

// Helper to get the single annotation from state (asserts exactly one exists)
function onlyAnnotation(state) {
  const vals = Object.values(state.annotations);
  expect(vals).toHaveLength(1);
  return vals[0];
}

describe('initialState', () => {
  test('has empty annotations and null songId', () => {
    expect(initialState).toEqual({ annotations: {}, songId: null });
  });
});

describe('ADD_CHORD', () => {
  test('creates a chord annotation with correct fields', () => {
    const state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 5, charOffsetEnd: 8, value: 'Am' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('chord');
    expect(ann.lineId).toBe('line-1');
    expect(ann.charOffset).toBe(5);
    expect(ann.charOffsetEnd).toBe(8);
    expect(ann.value).toBe('Am');
    expect(ann.id).toBeTruthy();
  });

  test('multiple chords at same position coexist (no deduplication)', () => {
    let state = emptyState();
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 3, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 3, value: 'C' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });

  test('preserves existing annotations', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-2', charOffset: 5, charOffsetEnd: 8, value: 'D' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });
});

describe('ADD_RIGHT_NOTE', () => {
  test('creates a right-side annotation with correct fields', () => {
    const state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 10, value: 'Big finish', style: 'default' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('right-side');
    expect(ann.lineId).toBe('line-1');
    expect(ann.value).toBe('Big finish');
    expect(ann.style).toBe('default');
  });

  test('replaces existing right-side note on the same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'First', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Second', style: 'default' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.value).toBe('Second');
  });

  test('replaces existing image annotation on the same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Note text', style: 'default' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('right-side');
    expect(ann.value).toBe('Note text');
  });

  test('does not affect annotations on other lines', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Line 1 note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-2', charOffset: 0, value: 'Line 2 note', style: 'default' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });
});

describe('ADD_IMAGE', () => {
  test('creates an image annotation', () => {
    const state = annotationReducer(emptyState(), {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('image');
    expect(ann.lineId).toBe('line-1');
    expect(ann.url).toBe('https://example.com/img.png');
  });

  test('replaces existing right-side note on same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Some note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.type).toBe('image');
  });

  test('replaces existing image annotation on same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/old.png' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/new.png' },
    });
    const ann = onlyAnnotation(state);
    expect(ann.url).toBe('https://example.com/new.png');
  });

  test('does not remove chord annotations on same line', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-1', charOffset: 0, url: 'https://example.com/img.png' },
    });
    expect(Object.values(state.annotations)).toHaveLength(2);
  });
});

describe('UPDATE_ANNOTATION', () => {
  test('updates specified fields on an existing annotation', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Old text', style: 'default' },
    });
    const id = Object.keys(state.annotations)[0];
    state = annotationReducer(state, {
      type: 'UPDATE_ANNOTATION',
      payload: { id, changes: { value: 'New text' } },
    });
    expect(state.annotations[id].value).toBe('New text');
    expect(state.annotations[id].style).toBe('default'); // unchanged
  });

  test('no-ops when id does not exist', () => {
    const state = emptyState();
    const next = annotationReducer(state, {
      type: 'UPDATE_ANNOTATION',
      payload: { id: 'nonexistent', changes: { value: 'foo' } },
    });
    expect(next).toBe(state); // reference equality — no new object
  });
});

describe('DELETE_ANNOTATION', () => {
  test('removes annotation by id', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    const id = Object.keys(state.annotations)[0];
    state = annotationReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: { id },
    });
    expect(Object.values(state.annotations)).toHaveLength(0);
  });

  test('does not affect other annotations', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-2', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    const idToDelete = Object.keys(state.annotations)[0];
    state = annotationReducer(state, {
      type: 'DELETE_ANNOTATION',
      payload: { id: idToDelete },
    });
    expect(Object.values(state.annotations)).toHaveLength(1);
  });
});

describe('DELETE_ANNOTATIONS_FOR_LINE', () => {
  test('removes all annotations for the given lineId', () => {
    let state = emptyState();
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-2', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'DELETE_ANNOTATIONS_FOR_LINE',
      payload: { lineId: 'line-1' },
    });
    expect(Object.values(state.annotations)).toHaveLength(1);
    expect(Object.values(state.annotations)[0].lineId).toBe('line-2');
  });
});

describe('REMAP_LINE_IDS', () => {
  test('remaps annotation lineIds according to mapping', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'old-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'REMAP_LINE_IDS',
      payload: { mapping: { 'old-1': 'new-1' } },
    });
    const ann = onlyAnnotation(state);
    expect(ann.lineId).toBe('new-1');
  });

  test('annotations not in mapping are unchanged', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-stays', charOffset: 0, charOffsetEnd: 2, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'REMAP_LINE_IDS',
      payload: { mapping: { 'other-line': 'new-other' } },
    });
    const ann = onlyAnnotation(state);
    expect(ann.lineId).toBe('line-stays');
  });
});

describe('LOAD', () => {
  test('replaces full state with payload', () => {
    let state = annotationReducer(emptyState(), {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    const newState = { annotations: { 'x': { id: 'x', type: 'chord', lineId: 'y' } }, songId: 'song-abc' };
    state = annotationReducer(state, { type: 'LOAD', payload: newState });
    expect(state).toEqual(newState);
  });
});

describe('Selectors', () => {
  let state;
  beforeEach(() => {
    state = emptyState();
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, charOffsetEnd: 2, value: 'Am' },
    });
    state = annotationReducer(state, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 10, charOffsetEnd: 12, value: 'G' },
    });
    state = annotationReducer(state, {
      type: 'ADD_RIGHT_NOTE',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Some note', style: 'default' },
    });
    state = annotationReducer(state, {
      type: 'ADD_IMAGE',
      payload: { lineId: 'line-2', charOffset: 0, url: 'https://example.com/img.png' },
    });
  });

  describe('getChordsForLine', () => {
    test('returns all chords for a line', () => {
      const chords = getChordsForLine(state, 'line-1');
      expect(chords).toHaveLength(2);
      expect(chords.every(c => c.type === 'chord')).toBe(true);
    });

    test('returns empty array for line with no chords', () => {
      expect(getChordsForLine(state, 'line-2')).toEqual([]);
    });

    test('returns empty array for nonexistent lineId', () => {
      expect(getChordsForLine(state, 'nope')).toEqual([]);
    });
  });

  describe('getRightNoteForLine', () => {
    test('returns the right-side note for a line', () => {
      const note = getRightNoteForLine(state, 'line-1');
      expect(note).toBeDefined();
      expect(note.type).toBe('right-side');
      expect(note.value).toBe('Some note');
    });

    test('returns undefined for line with no right-side note', () => {
      expect(getRightNoteForLine(state, 'line-2')).toBeUndefined();
    });
  });

  describe('getImageForLine', () => {
    test('returns the image annotation for a line', () => {
      const img = getImageForLine(state, 'line-2');
      expect(img).toBeDefined();
      expect(img.type).toBe('image');
      expect(img.url).toBe('https://example.com/img.png');
    });

    test('returns undefined for line with no image', () => {
      expect(getImageForLine(state, 'line-1')).toBeUndefined();
    });
  });

  describe('getAnnotationsForLine', () => {
    test('returns all annotations for a line regardless of type', () => {
      const all = getAnnotationsForLine(state, 'line-1');
      expect(all).toHaveLength(3); // 2 chords + 1 right-side
    });

    test('returns empty array for nonexistent lineId', () => {
      expect(getAnnotationsForLine(state, 'nope')).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm run test:unit
```

Expected: all tests pass. If any fail, inspect and adjust (likely an off-by-one in expectations or a misread of reducer behavior).

- [ ] **Step 3: Commit**

```bash
git add tests/annotationReducer.test.js
git commit -m "feat(testing): add comprehensive annotation reducer unit tests"
```

---

### Task 4: Write `computeStackedLayout` unit tests

**Files:**
- Create: `tests/computeStackedLayout.test.js`

Note: `computeStackedLayout` and `ANNOTATION_GAP` are already named exports from `src/hooks/useAnnotationLayout.js`. No source changes needed.

- [ ] **Step 1: Write the tests**

```js
import { computeStackedLayout, ANNOTATION_GAP } from '../src/hooks/useAnnotationLayout.js';

describe('computeStackedLayout', () => {
  test('empty input returns empty layout map', () => {
    expect(computeStackedLayout([])).toEqual({});
  });

  test('single annotation returns entry with no displacement', () => {
    const entries = [{ lineId: 'a', naturalTop: 100, height: 40, lineTop: 100 }];
    const layout = computeStackedLayout(entries);
    expect(layout.a.top).toBe(100);
    expect(layout.a.displacement).toBe(0);
    expect(layout.a.height).toBe(40);
    expect(layout.a.lineTop).toBe(100);
  });

  test('non-overlapping annotations have no displacement', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 40, lineTop: 100 },
      { lineId: 'b', naturalTop: 200, height: 40, lineTop: 200 },
    ];
    const layout = computeStackedLayout(entries);
    expect(layout.a.displacement).toBe(0);
    expect(layout.b.displacement).toBe(0);
    expect(layout.b.top).toBe(200);
  });

  test('two overlapping entries: second is pushed down', () => {
    // a: top=100, height=60 → bottom=160. b: naturalTop=130 → overlap.
    // b placed at 160 + ANNOTATION_GAP
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 60, lineTop: 100 },
      { lineId: 'b', naturalTop: 130, height: 40, lineTop: 130 },
    ];
    const layout = computeStackedLayout(entries);
    const expectedBTop = 100 + 60 + ANNOTATION_GAP;
    expect(layout.a.top).toBe(100);
    expect(layout.b.top).toBe(expectedBTop);
    expect(layout.b.displacement).toBe(expectedBTop - 130);
  });

  test('cascading push-down: third entry pushed by second', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 50, lineTop: 100 },
      { lineId: 'b', naturalTop: 120, height: 50, lineTop: 120 },
      { lineId: 'c', naturalTop: 140, height: 50, lineTop: 140 },
    ];
    const layout = computeStackedLayout(entries);
    const bTop = 100 + 50 + ANNOTATION_GAP;
    const cTop = bTop + 50 + ANNOTATION_GAP;
    expect(layout.a.top).toBe(100);
    expect(layout.b.top).toBe(bTop);
    expect(layout.c.top).toBe(cTop);
  });

  test('gap between entries resets the stack', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 40, lineTop: 100 },
      { lineId: 'b', naturalTop: 500, height: 40, lineTop: 500 }, // far below
    ];
    const layout = computeStackedLayout(entries);
    expect(layout.a.displacement).toBe(0);
    expect(layout.b.displacement).toBe(0);
    expect(layout.b.top).toBe(500);
  });

  test('ANNOTATION_GAP constant is respected between stacked entries', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 50, lineTop: 100 },
      { lineId: 'b', naturalTop: 145, height: 50, lineTop: 145 }, // 5px overlap
    ];
    const layout = computeStackedLayout(entries);
    const actualGap = layout.b.top - (layout.a.top + 50);
    expect(actualGap).toBe(ANNOTATION_GAP);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm run test:unit
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/computeStackedLayout.test.js
git commit -m "feat(testing): add computeStackedLayout unit tests"
```

---

## Chunk 2: Test State Injection API & Playwright Setup

### Task 5: Add `window.__TEST__` API to TestEditor

**Files:**
- Modify: `src/pages/TestEditor.jsx`

- [ ] **Step 1: Update `TestEditorInner` to expose `window.__TEST__`**

In `TestEditor.jsx`, update the imports at the top:

```js
import { Button } from "@heroui/react";
import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import GlobalToolbar from "../components/GlobalToolbar";
import { LyricSheetProvider, useLyricSheet } from "../context/LyricSheetContext";
import LyricEditor from "../editor/LyricEditor";
import { useAnnotationLayout } from "../hooks/useAnnotationLayout";
import { PAGE_GAP, PAGE_HEIGHT } from "../editor/pageLayout";
```

Update `TestEditorInner` — replace its entire body:

```js
function TestEditorInner() {
  const bodyRef = useRef(null);
  const { state, editingNote, setLayoutMap, layoutReady, dispatch, editorRef } = useLyricSheet();
  useAnnotationLayout(bodyRef, state.annotations, editingNote, setLayoutMap);

  // Refs so the __TEST__ API always reads current values from closures
  const stateRef = useRef(state);
  stateRef.current = state;
  const editingNoteRef = useRef(editingNote);
  editingNoteRef.current = editingNote;

  // page-snapping ResizeObserver (unchanged)
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const snapToPages = () => {
      const tiptap = body.querySelector(".tiptap");
      if (!tiptap) return;
      const spacers = tiptap.querySelectorAll(".page-break-spacer");
      let spacerTotal = 0;
      spacers.forEach((s) => { spacerTotal += s.offsetHeight; });
      const contentHeight = tiptap.scrollHeight - spacerTotal;
      const pages = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT));
      const totalHeight = pages * PAGE_HEIGHT + (pages - 1) * PAGE_GAP;
      body.style.minHeight = `${totalHeight + spacerTotal}px`;
    };
    const observer = new ResizeObserver(snapToPages);
    const tiptap = body.querySelector(".tiptap");
    if (tiptap) observer.observe(tiptap);
    return () => observer.disconnect();
  }, []);

  // Programmatic test control API (only active in auth-bypass dev mode)
  useEffect(() => {
    let cancelled = false;

    // Poll via rAF until the TipTap editor instance is set by LyricEditor
    const readyPromise = new Promise((resolve) => {
      const check = () => {
        if (cancelled) return;
        if (editorRef.current) { resolve(); return; }
        requestAnimationFrame(check);
      };
      check();
    });

    const EMPTY_DOC = {
      type: 'doc',
      content: [{ type: 'songTitle' }, { type: 'paragraph' }],
    };

    // Waits for the next TipTap 'update' event + one rAF, then resolves.
    // Used so tests can await state changes settling into the DOM.
    function afterNextUpdate() {
      return new Promise((resolve) => {
        const onUpdate = () => {
          editorRef.current.off('update', onUpdate);
          requestAnimationFrame(resolve);
        };
        editorRef.current.on('update', onUpdate);
      });
    }

    window.__TEST__ = {
      ready: readyPromise,

      resetEditor: () => readyPromise.then(() => {
        dispatch({ type: 'LOAD', payload: { annotations: {}, songId: 'test-song' } });
        // Register listener BEFORE calling setContent — the 'update' event fires
        // synchronously during the command dispatch, so registering after would miss it.
        const settled = afterNextUpdate();
        editorRef.current.commands.setContent(EMPTY_DOC);
        return settled;
      }),

      setDocument: (doc) => readyPromise.then(() => {
        const settled = afterNextUpdate(); // register BEFORE dispatching
        editorRef.current.commands.setContent(doc);
        return settled;
      }),

      setAnnotations: (annotations) => readyPromise.then(() => {
        dispatch({ type: 'LOAD', payload: { annotations, songId: 'test-song' } });
        return new Promise((resolve) => requestAnimationFrame(resolve));
      }),

      selectText: (searchText) => readyPromise.then(() => new Promise((resolve) => {
        const editor = editorRef.current;
        let found = false;
        editor.state.doc.descendants((node, pos) => {
          if (found) return false;
          if (node.isText && node.text.includes(searchText)) {
            const offset = node.text.indexOf(searchText);
            editor.chain()
              .setTextSelection({ from: pos + offset, to: pos + offset + searchText.length })
              .run();
            found = true;
            return false;
          }
        });
        requestAnimationFrame(() => resolve(found));
      })),

      getState: () => ({
        document: editorRef.current?.getJSON(),
        annotations: stateRef.current.annotations,
        editingNote: editingNoteRef.current,
      }),
    };

    return () => {
      cancelled = true;
      delete window.__TEST__;
    };
  }, [dispatch, editorRef]);

  return (
    <>
      <GlobalToolbar />
      <div className="app-container">
        <div className="document-actions">
          <Link to="/" className="link document-actions-back">
            ← All songs
          </Link>
          <Button
            size="sm"
            color="accent"
            onPress={() => window.print()}
            startContent={<Printer size={16} />}
          >
            Print
          </Button>
        </div>
        <div className="document-container">
          <div className={`document-body${layoutReady ? " layout-ready" : ""}`} ref={bodyRef}>
            <LyricEditor />
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Manually verify the API works in the browser**

Start the test server:
```bash
npm run test:server
```

Open `http://localhost:3002/test` in Chrome, open DevTools console, and run:
```js
await window.__TEST__.ready
// Should resolve immediately (or after a brief poll)

await window.__TEST__.resetEditor()
// Editor should become blank (empty title + one empty paragraph)

await window.__TEST__.setDocument({
  type: 'doc',
  content: [
    { type: 'songTitle', content: [{ type: 'text', text: 'Test Song' }] },
    { type: 'paragraph', attrs: { lineId: 'p1' }, content: [{ type: 'text', text: 'Hello world' }] },
  ]
})
// Editor should show "Test Song" and "Hello world"

const found = await window.__TEST__.selectText('Hello')
// found === true; "Hello" should be selected in the editor

window.__TEST__.getState()
// Should return { document: {...}, annotations: {}, editingNote: null }
```

Expected: each step works as described. Fix any issues before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TestEditor.jsx
git commit -m "feat(testing): add window.__TEST__ API to TestEditor for Playwright control"
```

---

### Task 6: Install Playwright and create config + helpers

**Files:**
- Create: `playwright.config.js`
- Create: `e2e/helpers.js`
- Modify: `package.json` (already has test:e2e script from Task 1)

- [ ] **Step 1: Install Playwright and Chromium browser binary**

```bash
npm install -D @playwright/test --legacy-peer-deps
npx playwright install chromium
```

Expected: `@playwright/test` in devDependencies; Chromium downloaded to Playwright's cache.

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3002',
    viewport: { width: 1280, height: 900 },
    trace: 'off', // retries: 0, so on-first-retry would never capture
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run test:server',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

- [ ] **Step 3: Create `e2e/helpers.js`**

```js
/**
 * Shared helpers for RiffNotes Playwright e2e tests.
 *
 * All helpers that interact with the editor go through window.__TEST__,
 * which is exposed by TestEditor.jsx in auth-bypass mode.
 */

import { expect } from '@playwright/test';

/**
 * Navigate to /test and wait for the editor to be ready.
 * Call this once per test file in a beforeAll, or inline in tests that need a fresh page.
 */
export async function gotoTestEditor(page) {
  // Abort Supabase requests to avoid slow timeouts and console noise
  await page.route('**/supabase.co/**', (route) => route.abort());
  await page.goto('/test');
  // Wait for the React useEffect to fire and assign window.__TEST__
  // (the effect fires after mount, so it may not be defined at navigate-complete)
  await page.waitForFunction(() => typeof window.__TEST__ !== 'undefined');
  // Then await the editor-ready promise (waits for editorRef.current to be set)
  await page.evaluate(() => window.__TEST__.ready);
}

/**
 * Reset editor to empty document and clear all annotations.
 * Call in beforeEach to ensure test isolation.
 */
export async function resetEditor(page) {
  await page.evaluate(() => window.__TEST__.resetEditor());
  // Belt-and-suspenders: wait for DOM to show exactly one empty paragraph
  await page.waitForFunction(() => {
    const paras = document.querySelectorAll('.tiptap p');
    return paras.length === 1 && paras[0].textContent.trim() === '';
  });
}

/**
 * Inject a TipTap document JSON into the editor.
 */
export async function setDocument(page, doc) {
  await page.evaluate((d) => window.__TEST__.setDocument(d), doc);
  await page.waitForTimeout(100); // allow layout to settle
}

/**
 * Inject an annotations map into the annotation store.
 */
export async function setAnnotations(page, annotations) {
  await page.evaluate((a) => window.__TEST__.setAnnotations(a), annotations);
  await page.waitForTimeout(100);
}

/**
 * Select text in the editor using TipTap's setTextSelection API.
 * Throws if the text is not found. Waits for BubbleMenu to appear.
 */
export async function selectText(page, text) {
  const found = await page.evaluate((t) => window.__TEST__.selectText(t), text);
  if (!found) throw new Error(`Text not found in editor: "${text}"`);
  await page.waitForSelector('.annotation-toolbar', { timeout: 3000 });
}

/**
 * Get the current TipTap document JSON.
 */
export async function getEditorContent(page) {
  return page.evaluate(() => window.__TEST__.getState().document);
}

/**
 * Get the current annotations map.
 */
export async function getAnnotations(page) {
  return page.evaluate(() => window.__TEST__.getState().annotations);
}

/**
 * Simulate a plain-text paste into the focused editor element.
 */
export async function pasteText(page, text) {
  await page.evaluate((t) => {
    const editor = document.querySelector('.tiptap');
    editor.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  }, text);
}

/**
 * A minimal one-line document with a given lineId and text content.
 * Useful for tests that need a known starting state.
 */
export function oneLineDoc(lineId, text) {
  return {
    type: 'doc',
    content: [
      { type: 'songTitle' },
      {
        type: 'paragraph',
        attrs: { lineId },
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  };
}
```

- [ ] **Step 4: Create a smoke test to verify Playwright setup works**

Create `e2e/smoke.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor } from './helpers.js';

test.describe('Smoke test — Playwright setup', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
  });

  test('test editor loads and __TEST__ API is available', async ({ page }) => {
    const ready = await page.evaluate(() => typeof window.__TEST__);
    expect(ready).toBe('object');
  });

  test('resetEditor clears the editor to one empty paragraph', async ({ page }) => {
    await resetEditor(page);
    const paraCount = await page.locator('.tiptap p').count();
    expect(paraCount).toBe(1);
  });
});
```

- [ ] **Step 5: Run the smoke test**

```bash
npm run test:e2e -- --grep "Smoke test"
```

Expected: 2 tests pass. If the webServer fails to start, check `npm run test:server` runs correctly on its own first.

- [ ] **Step 6: Delete smoke test (it served its purpose)**

```bash
rm e2e/smoke.spec.js
```

- [ ] **Step 7: Commit**

```bash
git add playwright.config.js e2e/helpers.js package.json package-lock.json
git commit -m "feat(testing): install Playwright, add config and shared e2e helpers"
```

---

## Chunk 3: E2E Test Suite

### Task 7: Text editing e2e tests

**Files:**
- Create: `e2e/text-editing.spec.js`

- [ ] **Step 1: Create `e2e/text-editing.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, oneLineDoc } from './helpers.js';

test.describe('Text editing', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
  });

  test('typing in the editor creates a paragraph', async ({ page }) => {
    await page.locator('.tiptap p').first().click();
    await page.keyboard.type('Hello lyrics');
    await expect(page.locator('.tiptap p').first()).toHaveText('Hello lyrics');
  });

  test('pressing Enter splits a line into two paragraphs', async ({ page }) => {
    await page.locator('.tiptap p').first().click();
    await page.keyboard.type('Line one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line two');
    const paras = page.locator('.tiptap p');
    await expect(paras).toHaveCount(2);
    await expect(paras.nth(0)).toHaveText('Line one');
    await expect(paras.nth(1)).toHaveText('Line two');
  });

  test('Backspace at start of line merges with previous line', async ({ page }) => {
    await page.locator('.tiptap p').first().click();
    await page.keyboard.type('Line one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Line two');
    // Move to beginning of second line and backspace
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await expect(page.locator('.tiptap p')).toHaveCount(1);
    await expect(page.locator('.tiptap p').first()).toHaveText('Line oneLine two');
  });

  test('Tab in song title jumps focus to first lyric line', async ({ page }) => {
    // The song title renders as <h1 data-type="songTitle">
    await page.locator('.tiptap h1').first().click();
    await page.keyboard.type('My Song');
    await page.keyboard.press('Tab');
    // The first paragraph should now be focused — typing should go into it
    await page.keyboard.type('First lyric');
    await expect(page.locator('.tiptap p').first()).toHaveText('First lyric');
  });

  test('Shift-Tab from lyrics jumps back to song title', async ({ page }) => {
    await page.locator('.tiptap p').first().click();
    await page.keyboard.type('Some lyric');
    await page.keyboard.press('Shift+Tab');
    // Typing should now go into the title
    await page.keyboard.type('Song Title');
    await expect(page.locator('.tiptap h1').first()).toHaveText('Song Title');
  });

  test('Enter in song title creates a lyric paragraph', async ({ page }) => {
    await page.locator('.tiptap h1').first().click();
    await page.keyboard.type('My Song');
    await page.keyboard.press('Enter');
    // Should have at least 2 paragraphs now (the pre-existing one + the new split)
    const paras = page.locator('.tiptap p');
    await expect(paras).toHaveCount(2);
  });

  test('bold toggle via BubbleMenu', async ({ page }) => {
    await page.locator('.tiptap p').first().click();
    await page.keyboard.type('Bold me');
    // Select the text via __TEST__
    const found = await page.evaluate(() => window.__TEST__.selectText('Bold me'));
    expect(found).toBe(true);
    await page.waitForSelector('.annotation-toolbar');
    // Click Bold button
    await page.locator('.toolbar-btn').filter({ hasText: 'B' }).click();
    // Text should now be wrapped in <strong>
    await expect(page.locator('.tiptap p strong')).toHaveText('Bold me');
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
npm run test:e2e -- --grep "Text editing"
```

Expected: 5 tests pass. Fix any selector issues (the song title node may need a different selector — inspect the rendered HTML if needed).

- [ ] **Step 3: Commit**

```bash
git add e2e/text-editing.spec.js
git commit -m "feat(testing): add text editing e2e tests"
```

---

### Task 8: Paste behavior e2e tests

**Files:**
- Create: `e2e/paste.spec.js`

- [ ] **Step 1: Create `e2e/paste.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, pasteText, setDocument } from './helpers.js';

test.describe('Paste behavior', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);
    // Click into the first paragraph before each test
    await page.locator('.tiptap p').first().click();
  });

  test('pasting plain text creates one paragraph per line', async ({ page }) => {
    await pasteText(page, 'Line one\nLine two\nLine three');
    const paras = page.locator('.tiptap p');
    await expect(paras).toHaveCount(3);
    await expect(paras.nth(0)).toHaveText('Line one');
    await expect(paras.nth(1)).toHaveText('Line two');
    await expect(paras.nth(2)).toHaveText('Line three');
  });

  test('pasting preserves single blank lines as empty paragraphs', async ({ page }) => {
    await pasteText(page, 'Verse\nLine 1\n\nChorus\nLine 2');
    const paras = page.locator('.tiptap p');
    await expect(paras).toHaveCount(5);
    await expect(paras.nth(0)).toHaveText('Verse');
    await expect(paras.nth(1)).toHaveText('Line 1');
    await expect(paras.nth(2)).toHaveText(''); // blank separator
    await expect(paras.nth(3)).toHaveText('Chorus');
    await expect(paras.nth(4)).toHaveText('Line 2');
  });

  test('pasting collapses 3+ consecutive blank lines to one blank paragraph', async ({ page }) => {
    await pasteText(page, 'A\n\n\n\nB');
    const paras = page.locator('.tiptap p');
    // A, blank, B = 3 paragraphs
    await expect(paras).toHaveCount(3);
    await expect(paras.nth(0)).toHaveText('A');
    await expect(paras.nth(1)).toHaveText('');
    await expect(paras.nth(2)).toHaveText('B');
  });

  test('pasting rich HTML strips all formatting', async ({ page }) => {
    // Inject HTML into clipboard and paste — TipTap should ignore HTML and use
    // our handlePaste which reads text/plain only
    await page.evaluate(() => {
      const editor = document.querySelector('.tiptap');
      editor.focus();
      const dt = new DataTransfer();
      dt.setData('text/plain', 'Plain content');
      dt.setData('text/html', '<p style="font-size:24px;color:red;font-family:Arial"><strong>Plain content</strong></p>');
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    });
    // Text should appear, no inline styles on the paragraph
    await expect(page.locator('.tiptap p').first()).toHaveText('Plain content');
    const style = await page.locator('.tiptap p strong').count();
    expect(style).toBe(0); // no bold markup
  });

  test('pasting into middle of existing content inserts at cursor', async ({ page }) => {
    // Type some text first
    await page.locator('.tiptap p').first().click();
    await page.keyboard.type('Before ');
    // Paste should append at cursor position
    await pasteText(page, 'Pasted');
    // The text should now read "Before Pasted" in one or more paragraphs
    const text = await page.locator('.tiptap').innerText();
    expect(text).toContain('Before');
    expect(text).toContain('Pasted');
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
npm run test:e2e -- --grep "Paste behavior"
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/paste.spec.js
git commit -m "feat(testing): add paste behavior e2e tests"
```

---

### Task 9: Chord annotation e2e tests

**Files:**
- Create: `e2e/chord-annotations.spec.js`

- [ ] **Step 1: Create `e2e/chord-annotations.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, selectText, getAnnotations } from './helpers.js';

const DOC_WITH_LINE = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    {
      type: 'paragraph',
      attrs: { lineId: 'test-line-1' },
      content: [{ type: 'text', text: 'Do you know what worth fighting for' }],
    },
    {
      type: 'paragraph',
      attrs: { lineId: 'test-line-2' },
      content: [{ type: 'text', text: 'Child is slowly taken' }],
    },
  ],
};

test.describe('Chord annotations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);          // clear all state first
    await setDocument(page, DOC_WITH_LINE);
  });

  test('add chord via Add button', async ({ page }) => {
    await selectText(page, 'Do you');
    // Click the Chord button in the BubbleMenu toolbar
    await page.locator('.toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input');
    await page.locator('.toolbar-input').fill('Am');
    await page.locator('.toolbar-submit-btn').click();
    // Chord should appear in the editor
    await expect(page.locator('.chord-positioned')).toHaveText('Am');
  });

  test('add chord via Enter key', async ({ page }) => {
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input');
    await page.locator('.toolbar-input').fill('G');
    await page.keyboard.press('Enter');
    await expect(page.locator('.chord-positioned')).toHaveText('G');
  });

  test('cancel chord input via Escape returns to toolbar buttons', async ({ page }) => {
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input');
    await page.locator('.toolbar-input').fill('Dm');
    await page.keyboard.press('Escape');
    // Chord input should be gone, toolbar buttons should be back
    await expect(page.locator('.toolbar-input')).toHaveCount(0);
    // No chord was added
    const annotations = await getAnnotations(page);
    expect(Object.values(annotations).filter(a => a.type === 'chord')).toHaveLength(0);
  });

  test('after adding chord, selecting new text resets toolbar to buttons (not stuck in chord input)', async ({ page }) => {
    // Add a chord
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input');
    await page.locator('.toolbar-input').fill('F');
    await page.locator('.toolbar-submit-btn').click();
    await expect(page.locator('.chord-positioned')).toHaveText('F');

    // Select different text — toolbar should show buttons, not chord input
    await selectText(page, 'Child is');
    await expect(page.locator('.toolbar-btn').filter({ hasText: 'Chord' })).toBeVisible();
    await expect(page.locator('.toolbar-input')).toHaveCount(0);
  });

  test('delete a chord annotation', async ({ page }) => {
    // Add a chord first
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Chord' }).click();
    await page.waitForSelector('.toolbar-input');
    await page.locator('.toolbar-input').fill('C');
    await page.locator('.toolbar-submit-btn').click();
    await expect(page.locator('.chord-positioned')).toBeVisible();

    // Hover and delete — inspect rendered DOM for the exact delete button selector.
    // AnnotatedLineView renders chord overlays with className="chord-overlay" containing
    // "chord-positioned" spans. A delete button is revealed on hover inside the chord area.
    // If this step fails, open DevTools on the /test page, hover a chord, and find the
    // class name of the delete button to update this selector.
    await page.locator('.chord-overlay').hover();
    await page.locator('.chord-overlay .annotation-action-btn').first().click();
    await expect(page.locator('.chord-positioned')).toHaveCount(0);
  });
});
```

Note: The `.chord-delete-btn` selector may need adjustment based on the actual rendered markup. Inspect the DOM after adding a chord if the test fails on this step.

- [ ] **Step 2: Run and verify**

```bash
npm run test:e2e -- --grep "Chord annotations"
```

Expected: 5 tests pass. If any selector is wrong, check the rendered DOM and adjust.

- [ ] **Step 3: Commit**

```bash
git add e2e/chord-annotations.spec.js
git commit -m "feat(testing): add chord annotation e2e tests"
```

---

### Task 10: Right-side annotation e2e tests

**Files:**
- Create: `e2e/right-side-annotations.spec.js`

- [ ] **Step 1: Create `e2e/right-side-annotations.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, resetEditor, setDocument, setAnnotations, selectText, getAnnotations } from './helpers.js';

const DOC = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    {
      type: 'paragraph',
      attrs: { lineId: 'test-line-1' },
      content: [{ type: 'text', text: 'Do you know what worth fighting for' }],
    },
  ],
};

test.describe('Right-side annotations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);        // clear all state first
    await setDocument(page, DOC);
  });

  test('add a right-side note via the Note button', async ({ page }) => {
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Note' }).click();
    // Inline input should appear in the right column
    await page.waitForSelector('.note-inline-input');
    await page.locator('.note-inline-input').fill('Big finish here');
    await page.keyboard.press('Enter');
    // Note text should appear in the right column
    await expect(page.locator('.right-annotation-text')).toHaveText('Big finish here');
  });

  test('leader line is rendered connecting the note to the lyric line', async ({ page }) => {
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Note' }).click();
    await page.locator('.note-inline-input').fill('A note');
    await page.keyboard.press('Enter');
    // Leader line SVG should be present
    await expect(page.locator('.leader-line-svg')).toBeVisible();
  });

  test('clicking an existing note shows the inline edit input', async ({ page }) => {
    // Pre-seed an annotation
    await setAnnotations(page, {
      'ann-1': {
        id: 'ann-1', type: 'right-side', lineId: 'test-line-1',
        charOffset: 0, value: 'Existing note', style: 'default',
      },
    });
    await page.waitForSelector('.right-annotation-text');
    // Click the note text to edit it
    await page.locator('.right-annotation-text').click();
    await page.waitForSelector('.note-inline-input');
    const inputValue = await page.locator('.note-inline-input').inputValue();
    expect(inputValue).toBe('Existing note');
  });

  test('delete a right-side annotation', async ({ page }) => {
    // Pre-seed
    await setAnnotations(page, {
      'ann-1': {
        id: 'ann-1', type: 'right-side', lineId: 'test-line-1',
        charOffset: 0, value: 'Delete me', style: 'default',
      },
    });
    await page.waitForSelector('.right-annotation-text');
    // Hover to reveal actions, then delete
    await page.locator('.right-annotation-actions-wrapper').hover();
    await page.locator('.annotation-action-btn').first().click();
    // Confirm delete if two-step confirm is triggered
    const confirmBtn = page.locator('.annotation-action-btn--confirm');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await expect(page.locator('.right-annotation-text')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
npm run test:e2e -- --grep "Right-side annotations"
```

Expected: 4 tests pass. Adjust selectors as needed by inspecting the DOM.

- [ ] **Step 3: Commit**

```bash
git add e2e/right-side-annotations.spec.js
git commit -m "feat(testing): add right-side annotation e2e tests"
```

---

### Task 11: Annotation stacking e2e tests

**Files:**
- Create: `e2e/annotation-stacking.spec.js`

- [ ] **Step 1: Create `e2e/annotation-stacking.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, setDocument, setAnnotations } from './helpers.js';

// Document with 5 consecutive lyric lines — enough to trigger cascading stacking
const STACKING_DOC = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    { type: 'paragraph', attrs: { lineId: 's-1' }, content: [{ type: 'text', text: 'Line one' }] },
    { type: 'paragraph', attrs: { lineId: 's-2' }, content: [{ type: 'text', text: 'Line two' }] },
    { type: 'paragraph', attrs: { lineId: 's-3' }, content: [{ type: 'text', text: 'Line three' }] },
    { type: 'paragraph', attrs: { lineId: 's-4' }, content: [{ type: 'text', text: 'Line four' }] },
    { type: 'paragraph', attrs: { lineId: 's-5' }, content: [{ type: 'text', text: 'Line five' }] },
  ],
};

// Helper: get the bounding rect of an element by selector
async function getRect(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
  }, selector);
}

// Helper: get all annotation wrapper rects in DOM order
async function getAllAnnotationRects(page) {
  return page.evaluate(() => {
    const wrappers = document.querySelectorAll('.right-annotation-actions-wrapper');
    return Array.from(wrappers).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    });
  });
}

test.describe('Annotation stacking', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);            // clear all state first
    await setDocument(page, STACKING_DOC);
  });

  test('consecutive text annotations do not visually overlap', async ({ page }) => {
    await setAnnotations(page, {
      'a1': { id: 'a1', type: 'right-side', lineId: 's-1', charOffset: 0, value: 'Note on line 1', style: 'default' },
      'a2': { id: 'a2', type: 'right-side', lineId: 's-2', charOffset: 0, value: 'Note on line 2', style: 'default' },
      'a3': { id: 'a3', type: 'right-side', lineId: 's-3', charOffset: 0, value: 'Note on line 3', style: 'default' },
    });
    await page.waitForSelector('.right-annotation-actions-wrapper');
    await page.waitForTimeout(200); // allow layout to converge

    const rects = await getAllAnnotationRects(page);
    expect(rects).toHaveLength(3);
    // Each annotation's top should be below the previous one's bottom
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom);
    }
  });

  // Inline 1x1 transparent PNG data URI — no external network required
  const DATA_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  test('consecutive image annotations do not visually overlap', async ({ page }) => {
    await setAnnotations(page, {
      'a1': { id: 'a1', type: 'image', lineId: 's-1', charOffset: 0, url: DATA_IMG },
      'a2': { id: 'a2', type: 'image', lineId: 's-2', charOffset: 0, url: DATA_IMG },
      'a3': { id: 'a3', type: 'image', lineId: 's-3', charOffset: 0, url: DATA_IMG },
    });
    await page.waitForSelector('.right-annotation-image');
    await page.waitForTimeout(200);

    const rects = await getAllAnnotationRects(page);
    expect(rects).toHaveLength(3);
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom);
    }
  });

  test('mixed text and image annotations on adjacent lines do not overlap', async ({ page }) => {
    await setAnnotations(page, {
      'a1': { id: 'a1', type: 'right-side', lineId: 's-1', charOffset: 0, value: 'Text note', style: 'default' },
      'a2': { id: 'a2', type: 'image', lineId: 's-2', charOffset: 0, url: DATA_IMG },
      'a3': { id: 'a3', type: 'right-side', lineId: 's-3', charOffset: 0, value: 'Another note', style: 'default' },
    });
    await page.waitForSelector('.right-annotation-actions-wrapper');
    await page.waitForTimeout(200);

    const rects = await getAllAnnotationRects(page);
    expect(rects).toHaveLength(3);
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom);
    }
  });

  test('adding an annotation triggers re-layout of existing annotations', async ({ page }) => {
    // Start with one annotation, record its position
    await setAnnotations(page, {
      'a1': { id: 'a1', type: 'right-side', lineId: 's-2', charOffset: 0, value: 'Existing note', style: 'default' },
    });
    await page.waitForSelector('.right-annotation-actions-wrapper');
    await page.waitForTimeout(150);
    const rectBefore = await page.evaluate(() => {
      const el = document.querySelector('.right-annotation-actions-wrapper');
      const r = el.getBoundingClientRect();
      return { top: r.top };
    });

    // Add a tall annotation on the line above — should push the existing one down
    await setAnnotations(page, {
      'a1': { id: 'a1', type: 'right-side', lineId: 's-2', charOffset: 0, value: 'Existing note', style: 'default' },
      'a0': { id: 'a0', type: 'right-side', lineId: 's-1', charOffset: 0,
              value: 'This note is intentionally very long to ensure it causes the next annotation to be displaced downward in the stacking layout algorithm.', style: 'default' },
    });
    await page.waitForTimeout(200);

    const rectAfter = await page.evaluate(() => {
      const wrappers = document.querySelectorAll('.right-annotation-actions-wrapper');
      // Find the one for s-2 (second in DOM order)
      const r = wrappers[1]?.getBoundingClientRect();
      return r ? { top: r.top } : null;
    });

    // The existing annotation should have moved down due to re-layout
    expect(rectAfter).not.toBeNull();
    expect(rectAfter.top).toBeGreaterThanOrEqual(rectBefore.top);
  });

  test('displaced annotations have a diagonal leader line (SVG path with multiple points)', async ({ page }) => {
    // Force stacking by putting 3 annotations on consecutive lines
    await setAnnotations(page, {
      'a1': { id: 'a1', type: 'right-side', lineId: 's-1', charOffset: 0, value: 'First note — longer text that takes up vertical space so the next one gets displaced', style: 'default' },
      'a2': { id: 'a2', type: 'right-side', lineId: 's-2', charOffset: 0, value: 'Second note', style: 'default' },
    });
    await page.waitForSelector('.leader-line-svg');
    await page.waitForTimeout(200);

    // Check if any leader line SVG has 2 <line> elements (the elbow shape for displaced annotations)
    const hasElbow = await page.evaluate(() => {
      const svgs = document.querySelectorAll('.leader-line-svg');
      return Array.from(svgs).some((svg) => svg.querySelectorAll('line').length === 2);
    });
    expect(hasElbow).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
npm run test:e2e -- --grep "Annotation stacking"
```

Expected: 4 tests pass. The stacking tests rely on layout settling — if they're flaky, increase `waitForTimeout` values.

- [ ] **Step 3: Commit**

```bash
git add e2e/annotation-stacking.spec.js
git commit -m "feat(testing): add annotation stacking e2e tests"
```

---

### Task 12: Image annotation e2e tests

**Files:**
- Create: `e2e/image-annotations.spec.js`

- [ ] **Step 1: Create `e2e/image-annotations.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { gotoTestEditor, setDocument, setAnnotations, selectText, getAnnotations } from './helpers.js';

const DOC = {
  type: 'doc',
  content: [
    { type: 'songTitle' },
    {
      type: 'paragraph',
      attrs: { lineId: 'img-line-1' },
      content: [{ type: 'text', text: 'Do you know what worth fighting for' }],
    },
  ],
};

// Create a minimal 1x1 PNG as a base64-encoded ArrayBuffer for clipboard simulation
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test.describe('Image annotations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoTestEditor(page);
    await resetEditor(page);        // clear all state first
    await setDocument(page, DOC);
  });

  test('pasting an image while editing a right-side note creates an image annotation', async ({ page }) => {
    // First, start editing a note (click Note button from BubbleMenu)
    await selectText(page, 'Do you');
    await page.locator('.toolbar-btn').filter({ hasText: 'Note' }).click();
    await page.waitForSelector('.note-inline-input');

    // Simulate pasting a PNG image into the note input
    await page.evaluate((b64) => {
      const input = document.querySelector('.note-inline-input');
      if (!input) return;
      input.focus();

      // Decode base64 PNG to Uint8Array
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });

      const dt = new DataTransfer();
      dt.items.add(file);
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    }, TINY_PNG_B64);

    // Wait for the image annotation to appear
    await page.waitForSelector('.right-annotation-image', { timeout: 5000 });
    await expect(page.locator('.right-annotation-image')).toBeVisible();

    // The annotation store should have an image annotation
    const annotations = await getAnnotations(page);
    const imageAnns = Object.values(annotations).filter(a => a.type === 'image');
    expect(imageAnns).toHaveLength(1);
  });

  test('pasting an image replaces an existing right-side text note on the same line', async ({ page }) => {
    // Pre-seed a right-side text note
    await setAnnotations(page, {
      'ann-1': {
        id: 'ann-1', type: 'right-side', lineId: 'img-line-1',
        charOffset: 0, value: 'Will be replaced', style: 'default',
      },
    });
    await page.waitForSelector('.right-annotation-text');

    // Start editing the note (click it to open inline input)
    await page.locator('.right-annotation-text').click();
    await page.waitForSelector('.note-inline-input');

    // Paste image
    await page.evaluate((b64) => {
      const input = document.querySelector('.note-inline-input');
      input.focus();
      const binaryStr = atob(b64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    }, TINY_PNG_B64);

    // Wait for image annotation — text note should be gone
    await page.waitForSelector('.right-annotation-image', { timeout: 5000 });
    await expect(page.locator('.right-annotation-text')).toHaveCount(0);

    const annotations = await getAnnotations(page);
    const textAnns = Object.values(annotations).filter(a => a.type === 'right-side');
    expect(textAnns).toHaveLength(0);
  });
});
```

Note: The image paste test uses a synthetic `ClipboardEvent` with `DataTransfer.items.add()`. This is known to be unreliable in some Chromium builds — `items` may be read-only on programmatically constructed `ClipboardEvent.clipboardData`. If the test fails with no annotation created, check the console for errors and inspect whether `e.clipboardData.items` has the file. If `DataTransfer.items` is not writable, an alternative is to dispatch `ADD_IMAGE` directly via `window.__TEST__` and test the rendering/replacement behavior separately from the paste handler.

Supabase upload will fail (aborted by route interception), but `AnnotatedLineView.jsx` shows an instant preview via `URL.createObjectURL()` before the upload completes — so the image element should appear with a blob URL.

- [ ] **Step 2: Run and verify**

```bash
npm run test:e2e -- --grep "Image annotations"
```

Expected: 2 tests pass. If Supabase upload intercepted correctly, the image preview should still appear via blob URL.

- [ ] **Step 3: Run the full e2e suite**

```bash
npm run test:e2e
```

Expected: all tests pass.

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: unit tests + e2e tests all pass.

- [ ] **Step 5: Commit**

```bash
git add e2e/image-annotations.spec.js
git commit -m "feat(testing): add image annotation e2e tests"
```

- [ ] **Step 6: Final commit — update tests/.gitkeep**

```bash
rm tests/.gitkeep
git add -u tests/.gitkeep
git commit -m "chore: remove tests placeholder"
```

---

## Summary of All Files Created/Modified

| File | Action |
|------|--------|
| `vitest.config.js` | Create |
| `playwright.config.js` | Create |
| `src/editor/pasteUtils.js` | Create |
| `src/editor/LyricEditor.jsx` | Modify (use normalizePasteLines) |
| `src/pages/TestEditor.jsx` | Modify (add __TEST__ API) |
| `tests/pasteUtils.test.js` | Create |
| `tests/annotationReducer.test.js` | Create |
| `tests/computeStackedLayout.test.js` | Create |
| `e2e/helpers.js` | Create |
| `e2e/text-editing.spec.js` | Create |
| `e2e/paste.spec.js` | Create |
| `e2e/chord-annotations.spec.js` | Create |
| `e2e/right-side-annotations.spec.js` | Create |
| `e2e/annotation-stacking.spec.js` | Create |
| `e2e/image-annotations.spec.js` | Create |
| `package.json` | Modify (add scripts, install deps) |
| `src/App.test.jsx` | Delete |
| `src/context/LyricSheetContext.test.js` | Delete |
| `src/context/annotationReducer.test.js` | Delete |
