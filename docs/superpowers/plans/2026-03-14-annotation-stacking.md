---
type: project-doc
title: RiffNotes — Annotation Stacking Plan
project: riffnotes
created: 2026-03-14
updated: 2026-08-26
tags: [plan, annotations]
---

# Annotation Stacking & Elbow Leader Lines Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent right-rail annotations from overlapping by adding a layout coordinator that stacks them with 8px gaps and renders angled leader lines for displaced annotations.

**Architecture:** A `useAnnotationLayout` hook measures line DOM positions after render, applies per-type offsets to compute natural annotation positions, runs a greedy top-down stacking pass, and writes the layout map directly into `LyricSheetContext` via a setter. Each `AnnotatedLineView` reads its position from the map and applies it. Leader lines switch from CSS borders to SVG to support horizontal + diagonal paths.

**Tech Stack:** React 19, TipTap v3, CSS, inline SVG

**Spec:** `docs/superpowers/specs/2026-03-14-annotation-stacking-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/hooks/useAnnotationLayout.js` | **New.** Pure stacking algorithm + hook that measures DOM and writes `layoutMap` to context |
| `src/context/LyricSheetContext.jsx` | **Modify.** Add `layoutMap` state + `setLayoutMap` setter to context |
| `src/pages/SongEditor.jsx` | **Modify.** `SongEditorInner` calls `useAnnotationLayout` |
| `src/editor/nodeviews/AnnotatedLineView.jsx` | **Modify.** Read `layoutMap`, apply computed positions, SVG leader line |
| `src/editor/nodeviews/AnnotatedLineView.css` | **Modify.** Remove `.leader-bridge` CSS, add `.leader-line-container` styles |
| `TODO.md` | **Modify.** Add Approach B note |

---

## Chunk 1: Layout Coordinator

### Task 1: Create `useAnnotationLayout` hook with pure stacking algorithm

**Files:**
- Create: `src/hooks/useAnnotationLayout.js`

The hook exports two things: the pure `computeStackedLayout` function (for testability) and the `useAnnotationLayout` hook itself.

**Key design decisions (from review):**
- Measure **line element** positions as natural anchors, NOT annotation wrapper positions (avoids feedback loop where displaced annotations get re-measured at wrong positions)
- Include `lineTop` in each `layoutMap` entry so `AnnotatedLineView` can compute relative offsets without additional measurement
- Per-type CSS offsets (`TEXT_NOTE_OFFSET = 8`, `IMAGE_OFFSET = 0`, `INPUT_OFFSET = 8`) are added to line position to get the annotation's natural top
- Hook accepts `setLayoutMap` directly and writes to context — no intermediate state
- Annotations/editingNote are used as effect triggers, not `useCallback` dependencies

- [ ] **Step 1: Create `src/hooks/useAnnotationLayout.js`**

```js
import { useEffect, useRef, useCallback } from 'react';

// Named constants
export const ANNOTATION_GAP = 8;   // px — minimum gap between stacked annotations
export const BEND_INSET = 12;      // px — elbow bend point distance from column divider
const TEXT_NOTE_OFFSET = 8;        // px — CSS top offset for text notes
const IMAGE_OFFSET = 0;            // px — CSS top offset for image annotations
const INPUT_OFFSET = 8;            // px — CSS top offset for inline editing input

/**
 * Pure stacking algorithm. Takes an array of { lineId, naturalTop, height, lineTop }
 * sorted top-to-bottom, returns a layoutMap.
 */
export function computeStackedLayout(entries) {
  const layoutMap = {};
  let prevBottom = -Infinity;

  for (const { lineId, naturalTop, height, lineTop } of entries) {
    const placedTop = Math.max(naturalTop, prevBottom + ANNOTATION_GAP);
    const displacement = placedTop - naturalTop;
    layoutMap[lineId] = { top: placedTop, height, displacement, lineTop };
    prevBottom = placedTop + height;
  }

  return layoutMap;
}

/**
 * Determines the annotation type for a line element by checking which
 * annotation content is rendered, and returns the per-type CSS offset.
 */
function getAnnotationOffset(lineEl) {
  if (lineEl.querySelector('.note-inline-input')) return INPUT_OFFSET;
  if (lineEl.querySelector('.right-annotation-actions-wrapper--image')) return IMAGE_OFFSET;
  if (lineEl.querySelector('.right-annotation-actions-wrapper')) return TEXT_NOTE_OFFSET;
  return null; // no annotation
}

/**
 * Measures the rendered height of an annotation element.
 */
function getAnnotationHeight(lineEl, zoom) {
  const el = lineEl.querySelector('.right-annotation-actions-wrapper, .note-inline-input');
  if (!el) return 0;
  return el.getBoundingClientRect().height / zoom;
}

/**
 * Hook that measures line positions in the DOM, computes stacked layout,
 * and writes the result directly to context via setLayoutMap.
 *
 * @param {React.RefObject} bodyRef — ref to .document-body element
 * @param {object} annotations — state.annotations from context (used as effect trigger)
 * @param {object|null} editingNote — current editing note (used as effect trigger)
 * @param {function} setLayoutMap — setter from LyricSheetContext
 */
export function useAnnotationLayout(bodyRef, annotations, editingNote, setLayoutMap) {
  // Store annotations in a ref so the measure callback doesn't depend on them
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;
  const editingNoteRef = useRef(editingNote);
  editingNoteRef.current = editingNote;

  const measure = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    const container = body.closest('.document-container');
    const zoom = container ? (parseFloat(getComputedStyle(container).zoom) || 1) : 1;
    const bodyRect = body.getBoundingClientRect();
    const bodyTop = bodyRect.top / zoom;

    // Iterate all line elements in document order
    const lineEls = body.querySelectorAll('[data-line-id]');
    const entries = [];

    for (const lineEl of lineEls) {
      const lineId = lineEl.getAttribute('data-line-id');
      const offset = getAnnotationOffset(lineEl);
      if (offset === null) continue; // no annotation on this line

      // Natural top = line's position + per-type CSS offset
      const lineRect = lineEl.getBoundingClientRect();
      const lineTop = lineRect.top / zoom - bodyTop;
      const naturalTop = lineTop + offset;
      const height = getAnnotationHeight(lineEl, zoom);

      entries.push({ lineId, naturalTop, height, lineTop });
    }

    const newLayout = computeStackedLayout(entries);
    setLayoutMap(newLayout);
  }, [bodyRef, setLayoutMap]);

  // Recalculate when annotations or editing state changes
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [measure, annotations, editingNote]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => requestAnimationFrame(measure);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measure]);
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run dev`
Open http://localhost:3000 — app should load (hook not wired yet, just checking import works).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAnnotationLayout.js
git commit -m "feat: add useAnnotationLayout hook with stacking algorithm"
```

---

### Task 2: Add `layoutMap` to LyricSheetContext

**Files:**
- Modify: `src/context/LyricSheetContext.jsx`

- [ ] **Step 1: Add `layoutMap` state and `setLayoutMap` to provider**

In `LyricSheetProvider`, add after the `saveStatus` state (line 21):

```js
const [layoutMap, setLayoutMap] = useState({});
```

Add `layoutMap` and `setLayoutMap` to the `value` object (around line 104):

```js
const value = {
  state,
  dispatch,
  editorRef,
  setEditor,
  editingNote,
  startEditingNote,
  stopEditingNote,
  requestSave,
  saveStatus,
  initialDocument,
  isLocked,
  layoutMap,
  setLayoutMap,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/context/LyricSheetContext.jsx
git commit -m "feat: add layoutMap state to LyricSheetContext"
```

---

### Task 3: Wire up `useAnnotationLayout` in SongEditorInner

**Files:**
- Modify: `src/pages/SongEditor.jsx`

- [ ] **Step 1: Import and call the hook in `SongEditorInner`**

Add imports at top:

```js
import { useAnnotationLayout } from '../hooks/useAnnotationLayout';
import { useLyricSheet } from '../context/LyricSheetContext';
```

In `SongEditorInner`, after `const bodyRef = useRef(null);`, add:

```js
const { state, editingNote, setLayoutMap } = useLyricSheet();
useAnnotationLayout(bodyRef, state.annotations, editingNote, setLayoutMap);
```

Note: no intermediate state or useEffect needed — the hook writes directly to context.

- [ ] **Step 2: Verify the app still loads**

Run: `npm run dev`
Open http://localhost:3000 — editor should load without errors. Open browser console and check for warnings. The `layoutMap` should now be populated in context (can verify via React DevTools on the LyricSheetContext provider).

- [ ] **Step 3: Commit**

```bash
git add src/pages/SongEditor.jsx
git commit -m "feat: wire useAnnotationLayout into SongEditorInner"
```

---

## Chunk 2: Apply Layout Positions in AnnotatedLineView

### Task 4: Apply computed positions from layoutMap

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.jsx`

This task makes annotations use the stacked positions from `layoutMap` instead of the fixed CSS `top` values. The `layoutMap` entry includes `lineTop`, so `AnnotatedLineView` computes its relative offset as `layout.top - layout.lineTop` — no additional DOM measurement needed.

- [ ] **Step 1: Read `layoutMap` from context and compute offset**

In `AnnotatedLineView.jsx`, update the destructure at line 11:

```js
const { state, dispatch, editingNote, stopEditingNote, editorRef, isLocked, layoutMap } = useLyricSheet();
```

After `const charOffsetForLeader = ...` (line 88), add:

```js
// Layout coordinator: compute relative top offset for this line's annotation.
// layout.top is absolute (relative to .document-body), layout.lineTop is the line's
// position in the same coordinate space. The difference gives us the CSS `top` value
// to apply to the annotation wrapper (which is position: absolute within the line).
const layout = layoutMap?.[lineId];
const annotationTopOffset = layout ? layout.top - layout.lineTop : null;
const displacement = layout?.displacement ?? 0;
```

- [ ] **Step 2: Apply `annotationTopOffset` to annotation wrappers**

Update the three render branches inside `{showRightColumn && (…)}`:

**Inline input** (wrap in a positioned div so it participates in stacking):
```jsx
isEditingNote ? (
  <div
    className="right-annotation-actions-wrapper"
    style={annotationTopOffset != null ? { top: `${annotationTopOffset}px` } : undefined}
  >
    <input
      ref={noteInputRef}
      className="note-inline-input"
      type="text"
      placeholder="type note or paste image"
      onPaste={handleNotePaste}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); handleNoteSubmit(e.target.value); }
        else if (e.key === 'Escape') { handleNoteCancel(); }
      }}
      onBlur={(e) => {
        handleNoteCancel();
      }}
    />
  </div>
)
```

**Image annotation** — add inline style:
```jsx
<div
  ref={rightAnnotationRef}
  className="right-annotation-actions-wrapper right-annotation-actions-wrapper--image"
  style={annotationTopOffset != null ? { top: `${annotationTopOffset}px` } : undefined}
  onMouseEnter={rightAnnotationMouseEnter}
  onMouseLeave={rightAnnotationMouseLeave}
>
```

**Text annotation** — add inline style:
```jsx
<div
  ref={rightAnnotationRef}
  className="right-annotation-actions-wrapper"
  style={annotationTopOffset != null ? { top: `${annotationTopOffset}px` } : undefined}
  onMouseEnter={rightAnnotationMouseEnter}
  onMouseLeave={rightAnnotationMouseLeave}
>
```

- [ ] **Step 3: Test stacking visually**

Run: `npm run dev`
1. Create or open a song with annotations on consecutive lines (paste images or add text notes on adjacent lines)
2. Annotations should stack without overlap, with visible 8px gaps
3. Adding/removing annotations should cause others to adjust in real time
4. The inline editing input should also participate — start typing a note on a line adjacent to an existing annotation
5. Single annotations (no neighbors) should appear at their natural positions unchanged

- [ ] **Step 4: Commit**

```bash
git add src/editor/nodeviews/AnnotatedLineView.jsx
git commit -m "feat: apply stacked positions from layoutMap to annotations"
```

---

## Chunk 3: SVG Leader Lines

### Task 5: Replace CSS leader bridge with SVG leader line

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.jsx`
- Modify: `src/editor/nodeviews/AnnotatedLineView.css`

The leader line container is a flex child that fills the gap between lyric content and the annotation column (same as the old `.leader-bridge`). For non-displaced annotations, it draws a horizontal dashed line. For displaced, it draws a horizontal segment to the bend point, then a diagonal to the annotation.

The SVG uses a `viewBox` tied to the container's measured width and height, so all coordinates are in CSS pixels. The bend point X is `containerWidth - BEND_INSET` (12px from the right edge of the leader, which ends at the column divider).

- [ ] **Step 1: Add leader line measurement and SVG rendering**

In `AnnotatedLineView.jsx`, add a ref and measurement for the leader container:

```js
const leaderRef = useRef(null);
const [leaderSize, setLeaderSize] = useState({ width: 0, height: 0 });

// Measure leader container dimensions for SVG viewBox
const measureLeader = useCallback(() => {
  if (!leaderRef.current) return;
  const container = leaderRef.current.closest('.document-container');
  const zoom = container ? (parseFloat(getComputedStyle(container).zoom) || 1) : 1;
  const rect = leaderRef.current.getBoundingClientRect();
  setLeaderSize({ width: rect.width / zoom, height: rect.height / zoom });
}, []);

useEffect(() => {
  measureLeader();
}, [measureLeader, displacement, pullbackPx]);
```

Replace the `<span className="leader-bridge" .../>` JSX (lines 339-345) with:

```jsx
{showRightColumn && (
  <div
    ref={leaderRef}
    className="leader-line-container"
    contentEditable={false}
    style={{
      marginLeft: pullbackPx > 0 ? `-${pullbackPx}px` : undefined,
      height: displacement > 0 ? `${displacement + 20}px` : undefined,
      alignSelf: displacement > 0 ? 'flex-start' : undefined,
    }}
  >
    <svg
      className="leader-line-svg"
      viewBox={`0 0 ${leaderSize.width} ${leaderSize.height || 20}`}
      preserveAspectRatio="none"
    >
      {displacement > 0 && leaderSize.width > 0 ? (
        <>
          {/* Horizontal segment from left edge to bend point */}
          <line
            x1="0" y1="10"
            x2={Math.max(0, leaderSize.width - BEND_INSET)} y2="10"
            className="leader-line"
            vectorEffect="non-scaling-stroke"
          />
          {/* Diagonal from bend point down to bottom-right corner */}
          <line
            x1={Math.max(0, leaderSize.width - BEND_INSET)} y1="10"
            x2={leaderSize.width} y2={leaderSize.height || 20}
            className="leader-line"
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        <line
          x1="0" y1="50%"
          x2="100%" y2="50%"
          className="leader-line"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  </div>
)}
```

Add the `BEND_INSET` import at the top of the file:
```js
import { BEND_INSET } from '../../hooks/useAnnotationLayout';
```

- [ ] **Step 2: Update CSS — remove old leader-bridge, add new styles**

In `AnnotatedLineView.css`, replace the `.leader-bridge` block (lines 50-71) and the `.annotated-line.has-image-annotation .leader-bridge` block (lines 233-238) with:

```css
/*
 * Leader line: SVG-based dashed line connecting lyrics to annotations.
 * Container is a flex child that fills the gap between lyric content and annotation column.
 * For displaced annotations, the container grows taller and the SVG draws an angled path.
 */
.leader-line-container {
  flex: 1 1 60px;
  min-width: 24px;
  position: relative;
  height: 20px;
}

.leader-line-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  display: block;
}

.leader-line {
  stroke: var(--color-leader-dots);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  fill: none;
}
```

- [ ] **Step 3: Remove `has-image-annotation` class if no longer needed**

In `AnnotatedLineView.jsx`, the `has-image-annotation` class on `NodeViewWrapper` (line 332) was only used by the now-removed `.annotated-line.has-image-annotation .leader-bridge` CSS rule. Check for any other uses:

```bash
grep -r "has-image-annotation" src/ --include="*.css" --include="*.jsx" --include="*.js"
```

If only used in the deleted CSS rule and the JSX class assignment, remove it from the `NodeViewWrapper` className:

```jsx
<NodeViewWrapper
  className={`annotated-line ${showRightColumn ? 'has-right-annotation' : ''}`}
  data-line-id={lineId}
>
```

- [ ] **Step 4: Test leader lines visually**

Run: `npm run dev`
1. Non-displaced annotations should have a straight horizontal dashed leader line (same visual as before)
2. Displaced annotations should have a horizontal segment, then a diagonal going down to the annotation
3. The diagonal should start 12px before the column divider
4. Test with different displacement amounts — small (1 line pushed) and large (several lines cascading)
5. Resize the window — leader lines should adapt
6. Print preview (Ctrl+P) — dashed lines should render correctly

- [ ] **Step 5: Commit**

```bash
git add src/editor/nodeviews/AnnotatedLineView.jsx src/editor/nodeviews/AnnotatedLineView.css
git commit -m "feat: replace CSS leader bridge with SVG leader line supporting elbows"
```

---

## Chunk 4: Cleanup & Polish

### Task 6: Clean up and test edge cases

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.css` (if any remaining cleanup)
- Modify: `TODO.md`

- [ ] **Step 1: Update TODO.md**

Add to TODO.md under the existing annotation improvement bullet:

```markdown
- **Architecture: Shared Annotation Rail (Approach B)** — move all right-column annotation rendering from individual AnnotatedLineView NodeViews into a single AnnotationRail overlay component. This would simplify layout coordination (single component handles stacking) and enable features like drag-to-reorder. Deferred in favor of Approach A (coordinator) for initial implementation.
```

- [ ] **Step 2: Test edge cases**

Run: `npm run dev`

Test these scenarios:
1. **Single annotation** — no displacement, straight leader
2. **Two adjacent annotations** — second pushes down, gets elbow leader
3. **Three+ adjacent annotations** — cascading displacement
4. **Mixed types** — image then text note, text note then image
5. **Delete middle annotation** — annotations below should relax up
6. **Add annotation between existing ones** — should push lower ones down
7. **Inline editing input** — start editing on a line adjacent to an existing annotation
8. **Empty lines between annotated lines** — no stacking needed, both at natural positions
9. **Locked song (example song)** — annotations display correctly, leader lines work
10. **Print** (Ctrl+P) — dashed lines render correctly in print preview

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git add TODO.md
git commit -m "chore: add Approach B (annotation rail) to TODO"
```

---

## Testing Notes

**No unit test runner** is currently configured (vitest is not installed). The stacking algorithm (`computeStackedLayout`) is exported as a pure function for future unit testing. For now, testing is manual via the dev server.

**TestEditor compatibility**: `TestEditor` does not use `SongEditorInner`, so `setLayoutMap` is never called and `layoutMap` remains `{}`. `AnnotatedLineView` handles this gracefully: `layoutMap?.[lineId]` returns `undefined`, and the component falls back to current non-coordinated positioning (CSS `top: 8px` / `top: 0` from the stylesheet).

**Playwright**: The `/test` route with `VITE_AUTH_BYPASS=true` can be used for automated visual testing if needed. The test editor would need multiple annotations added programmatically to test stacking.
