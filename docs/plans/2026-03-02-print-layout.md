---
type: project-doc
title: RiffNotes — Print Layout Implementation Plan
project: riffnotes
created: 2026-03-02
updated: 2026-08-26
tags: [plan, print]
---

# Print Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make GigNotes produce clean 8.5×11 printable band practice notes while the on-screen editor feels like a letter-width document.

**Architecture:** Fluid-width document constrained to 816px (8.5" at 96dpi). All print formatting lives in a standalone `src/print.css` with `@media print` rules. A Print button in the app header calls `window.print()`. Each song gets a stable `songId` UUID in its persisted state to enable a future multi-song library.

**Tech Stack:** React 18, CSS custom properties, `@media print` / `@page`, `crypto.randomUUID()`

---

### Task 1: Narrow document to letter width

**Files:**
- Modify: `src/styles/variables.css`

**Step 1: Change the CSS variable**

In `src/styles/variables.css`, change line 40:
```css
/* Before */
--document-max-width: 950px;

/* After */
--document-max-width: 816px;
```

**Step 2: Verify in browser**

Run `npm start`. Confirm the document container is narrower — approximately the width of a sheet of paper relative to the viewport. The annotation column (rightmost 25%) should still be visible and not cramped.

**Step 3: Commit**

```bash
git add src/styles/variables.css
git commit -m "feat: constrain document to 8.5in letter width"
```

---

### Task 2: Add songId to persisted data model

**Files:**
- Modify: `src/context/annotationReducer.js`
- Modify: `src/context/LyricSheetContext.js`
- Create: `src/context/annotationReducer.test.js`

**Step 1: Write the failing test**

Create `src/context/annotationReducer.test.js`:

```js
import { annotationReducer, initialState } from './annotationReducer';

describe('annotationReducer', () => {
  test('initialState includes a null songId field', () => {
    expect(initialState).toHaveProperty('songId');
    expect(initialState.songId).toBeNull();
  });

  test('LOAD action replaces state including songId', () => {
    const newState = {
      annotations: {},
      songId: 'test-song-uuid',
    };
    const result = annotationReducer(initialState, {
      type: 'LOAD',
      payload: newState,
    });
    expect(result.songId).toBe('test-song-uuid');
  });

  test('ADD_CHORD preserves songId', () => {
    const stateWithId = { ...initialState, songId: 'abc-123' };
    const result = annotationReducer(stateWithId, {
      type: 'ADD_CHORD',
      payload: { lineId: 'line-1', charOffset: 0, value: 'Am' },
    });
    expect(result.songId).toBe('abc-123');
  });
});
```

**Step 2: Run the test — expect failure**

```bash
npm test -- --testPathPattern=annotationReducer --watchAll=false
```

Expected: FAIL — `initialState` does not have a `songId` property.

**Step 3: Add songId to initialState**

In `src/context/annotationReducer.js`, change `initialState`:

```js
const initialState = {
  annotations: {},
  songId: null,
};
```

No other reducer changes needed — existing `LOAD` action already replaces state wholesale, and spread operators in other cases already pass through unknown fields.

**Step 4: Run the tests — expect pass**

```bash
npm test -- --testPathPattern=annotationReducer --watchAll=false
```

Expected: PASS (3 tests).

**Step 5: Update LyricSheetContext to generate and migrate songId**

In `src/context/LyricSheetContext.js`, add a `generateSongId` helper and update `loadFromStorage` and the provider:

```js
// Add this helper near the top of the file, after the STORAGE_KEY line
function generateSongId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'song-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
```

Update `loadFromStorage` to migrate existing stored data that lacks a `songId`:

```js
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.annotations) {
        if (!parsed.songId) {
          return { ...parsed, songId: generateSongId() };
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load annotation data from localStorage:', e);
  }
  return null;
}
```

Update the provider to assign a `songId` for fresh (no saved state) sessions:

```js
function LyricSheetProvider({ children }) {
  const savedState = loadFromStorage();
  const [state, dispatch] = useReducer(
    annotationReducer,
    savedState || { ...initialState, songId: generateSongId() }
  );
  // ... rest unchanged
```

**Step 6: Verify in browser**

Open the app. Open DevTools → Application → Local Storage. Confirm `gignotes-data` now has a `"songId"` field. Reload — the same `songId` should persist.

**Step 7: Commit**

```bash
git add src/context/annotationReducer.js src/context/LyricSheetContext.js src/context/annotationReducer.test.js
git commit -m "feat: add stable songId to persisted song state"
```

---

### Task 3: Create print.css

**Files:**
- Create: `src/print.css`
- Modify: `src/index.js`

**Step 1: Create src/print.css**

```css
@media print {
  /* Page setup */
  @page {
    size: letter portrait;
    margin: 0.75in;
  }

  /* Preserve annotation colors — without this, browsers strip colored text to black */
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Reset page background — no gray surround when printing */
  body {
    background: white;
  }

  /* Remove screen chrome from app shell */
  .app-container {
    padding: 0;
    min-height: auto;
    display: block;
  }

  /* Document fills the print area; remove decorative shadow */
  .document-container {
    max-width: 100%;
    width: 100%;
    box-shadow: none;
  }

  /* Hide the print button itself */
  .print-btn {
    display: none;
  }

  /* Hide the BubbleMenu toolbar (TipTap renders this via Tippy.js) */
  .tippy-box {
    display: none !important;
  }

  /* Avoid splitting a lyric line with its chord overlay or right annotation across pages */
  .annotated-line {
    break-inside: avoid;
  }

  /* Avoid a section marker sitting alone at the bottom of a page */
  h2 {
    break-after: avoid;
  }
}
```

**Step 2: Import print.css in src/index.js**

Add the import after the existing `./index.css` import:

```js
import './index.css';
import './print.css';
```

**Step 3: Verify with print preview**

Run `npm start`. Open the app with some lyrics and annotations. Open the browser print dialog (Ctrl+P or Cmd+P). Confirm:
- Gray background is gone; white page fills the preview
- Chord annotations print in their dark color, not stripped to black
- Right-side annotations print in purple/red
- The BubbleMenu toolbar is not visible
- Content fits within the letter-sized page with ~0.75" margins

**Step 4: Commit**

```bash
git add src/print.css src/index.js
git commit -m "feat: add print.css with letter-page formatting and color preservation"
```

---

### Task 4: Add Print button

**Files:**
- Modify: `src/App.js`
- Modify: `src/App.css`
- Create: `src/App.test.js`

**Step 1: Write the failing test**

Create `src/App.test.js`:

```js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// LyricEditor uses TipTap which doesn't work in jsdom — mock it
jest.mock('./editor/LyricEditor', () => () => <div data-testid="lyric-editor" />);

import App from './App';

beforeEach(() => {
  // Provide a minimal localStorage stub so LyricSheetProvider doesn't crash
  Storage.prototype.getItem = jest.fn(() => null);
  Storage.prototype.setItem = jest.fn();
  window.print = jest.fn();
});

test('renders a Print button', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
});

test('Print button calls window.print()', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /print/i }));
  expect(window.print).toHaveBeenCalledTimes(1);
});
```

**Step 2: Run the test — expect failure**

```bash
npm test -- --testPathPattern=App --watchAll=false
```

Expected: FAIL — no Print button rendered.

**Step 3: Add Print button to App.js**

Update `src/App.js`:

```jsx
function App() {
  return (
    <LyricSheetProvider>
      <div className="app-container">
        <div className="app-toolbar">
          <button className="print-btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <div className="document-container">
          <div className="document-header">
            <h1 className="document-title" />
          </div>
          <div className="document-body">
            <LyricEditor />
          </div>
        </div>
      </div>
    </LyricSheetProvider>
  );
}
```

**Step 4: Style the toolbar and button in App.css**

Add to the end of `src/App.css`:

```css
.app-toolbar {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  max-width: var(--document-max-width);
  padding: 0 0 8px;
}

.print-btn {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 6px 16px;
  border-radius: 6px;
  font-family: var(--font-ui);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.print-btn:hover {
  background: var(--color-bg-document);
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}
```

**Step 5: Run the tests — expect pass**

```bash
npm test -- --testPathPattern=App --watchAll=false
```

Expected: PASS (2 tests).

**Step 6: Run all tests**

```bash
npm test -- --watchAll=false
```

Expected: all tests pass (2 in App.test.js + 3 in annotationReducer.test.js = 5 total).

**Step 7: Verify in browser**

Run `npm start`. Confirm:
- Print button appears above the document, right-aligned
- Clicking it opens the browser print dialog
- Button is not visible in print preview

**Step 8: Commit**

```bash
git add src/App.js src/App.css src/App.test.js
git commit -m "feat: add Print button to app toolbar"
```
