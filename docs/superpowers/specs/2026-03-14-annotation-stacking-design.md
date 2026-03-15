# Right-Rail Annotation Stacking & Elbow Leader Lines

## Problem

When two or more consecutive lyric lines have right-column annotations (images, text notes, or the inline editing input), the annotations overlap visually. Each `AnnotatedLineView` renders its annotation independently with no awareness of neighbors. The right-annotation-column uses `height: 0; overflow: visible`, so annotations float below their line with no collision avoidance.

## Solution

Add a **layout coordinator** that measures all annotation positions after render, computes stacked positions to prevent overlap, and exposes the results via context so each `AnnotatedLineView` can position its annotation correctly. Replace the CSS-based leader line with an SVG that supports angled connections when annotations are displaced.

## Design Decisions

- **Approach A (coordinator)** chosen over **Approach B (shared overlay rail)**. Approach A is less invasive — annotations stay co-located with their line's interaction logic. Approach B is tracked in TODO.md as a future architectural improvement.
- **Push direction**: always push down. The first annotation stays at its natural position; subsequent overlapping annotations are pushed further down.
- **Page breaks**: ignored for now. Annotations may overflow into page gaps or off the page. A page-break-aware strategy will be designed after the core stacking feature is stable.
- **Inline editing input**: participates in the stacking layout like any other annotation.

## Layout Algorithm

A top-down greedy stacking pass:

1. Collect all lines that have an annotation (right-note, image, or active editing input), in document order.
2. For each annotated line, measure its **natural top** (the line's DOM position relative to `.document-body`) and its **annotation height** (rendered content height). Natural top includes the per-type CSS offset: text notes render at `+8px` below the line, images at `+0px`. These offsets are incorporated into the natural top so the algorithm works with actual rendered positions.
3. Walk top-to-bottom: place each annotation at `max(naturalTop, previousAnnotationBottom + ANNOTATION_GAP)`, where `ANNOTATION_GAP = 8` (px, in CSS pixels).
4. Compute `displacement` as `placedTop - naturalTop`. If displacement > 0, the annotation is displaced.
5. Store results as `layoutMap: { [lineId]: { top: number, height: number, displacement: number } }`.

The `top` value is in **CSS pixels relative to `.document-body`** — the same coordinate space used by PageBreaks. Each `AnnotatedLineView` converts this to a `top` offset relative to its own `.right-annotation-column` by subtracting the line's own position.

The initial value of `layoutMap` in `LyricSheetProvider` is `{}` (empty object). When no entry exists for a `lineId`, the `AnnotatedLineView` falls back to current non-coordinated positioning.

### Recalculation triggers

- Annotation changes (add, delete, update) — deletions cause previously displaced annotations below to relax toward their natural positions on the next recalculation
- Editor content changes (lines added, removed, reordered, text edited)
- Window resize

### Convergence

Repositioning annotations should not cause further layout shifts (annotations use `position: absolute` within a `height: 0` container, so they don't affect document flow). Unlike PageBreaks (which converges via ProseMirror transaction dispatch), the annotation layout uses React state — the `layoutMap` update triggers a re-render of consuming `AnnotatedLineView` components. Since the absolutely-positioned annotations don't affect document flow, a second measurement pass should find no changes. If shifts do occur, re-run once and cap at 2 iterations.

## Leader Line Geometry

### Non-displaced (annotation at natural position)

Horizontal dashed line from `charOffset` position to the annotation — same as current behavior, but rendered as SVG instead of CSS `border-bottom`.

### Displaced (annotation pushed down)

Two-segment path (Option B from brainstorming):

1. **Horizontal segment**: from `charOffset` position on the source line, extending right to a bend point located **12px to the left of the column divider**.
2. **Diagonal segment**: from the bend point, angled down to the annotation's actual rendered position (left edge of the annotation).

The bend point's horizontal position is computed from the known document geometry: the divider is at `75%` of `.document-body` width (816px × 0.75 = 612px from left). The bend point is at `612 - BEND_INSET = 600px` from the document-body left edge, where `BEND_INSET = 12` (px). Since the divider is a CSS `::after` pseudo-element and cannot be measured with `getBoundingClientRect()`, this is calculated from constants rather than measured.

The diagonal's angle varies naturally with the displacement distance — small displacement produces a shallow angle, large displacement produces a steep one.

All segments: 1px dashed stroke, same color as the current leader line (`--color-leader-dots`).

### Print considerations

SVG `stroke-dasharray` renders in print across browsers. Print testing should verify the dashed pattern looks correct, especially for diagonal segments where the dash pattern may appear different than horizontal ones.

## Layout Coordinator Implementation

### New hook: `useAnnotationLayout`

Location: `src/hooks/useAnnotationLayout.js` (new directory — `src/hooks/` does not exist yet)

- **Inputs**: ref to the `.document-body` DOM element, annotation state, editing note state
- **Outputs**: `layoutMap` object
- **Timing**: runs after render via `requestAnimationFrame` to batch with the browser's layout pass
- **Measurement**: queries all `[data-line-id]` elements within the document body that have annotations, reads their `getBoundingClientRect()` positions relative to `.document-body`
- **Zoom handling**: both element rects and the container rect are divided by the computed zoom factor before computing relative positions (same pattern as existing chord/pullback measurements in `AnnotatedLineView`)

### Context integration

Called from `SongEditorInner` (not the outer `SongEditor`), since `SongEditorInner` is the component inside `LyricSheetProvider` that owns the `bodyRef` to `.document-body` and has access to context via `useLyricSheet()`.

`LyricSheetProvider` exposes a `setLayoutMap` setter in its context value. `SongEditorInner` calls `useAnnotationLayout(bodyRef, state, editingNote)` and passes the result to `setLayoutMap`. Each `AnnotatedLineView` reads `layoutMap` from context.

Data flow:
```
LyricSheetProvider (owns layoutMap state + setLayoutMap setter)
  → SongEditorInner (calls useAnnotationLayout, writes via setLayoutMap)
    → each AnnotatedLineView reads layoutMap[lineId] via useLyricSheet()
```

### TestEditor compatibility

`TestEditor` does not use `SongEditorInner` and will not call `useAnnotationLayout`. `AnnotatedLineView` handles this gracefully: `layoutMap?.[lineId]` returns `undefined`, and the component falls back to the current non-coordinated positioning. This is acceptable since `TestEditor` is for Playwright testing, not production use.

## AnnotatedLineView Changes

1. **Read layout position**: `const layout = layoutMap?.[lineId]` from context. If `undefined` (e.g., in TestEditor), fall back to current behavior.
2. **Apply computed top**: `.right-annotation-actions-wrapper` uses the `top` value derived from `layout.top` minus the line's own document-body-relative position, instead of the current fixed `top: 8px` / `top: 0`.
3. **SVG leader line**: replace the `.leader-bridge` CSS span with an inline `<svg>` element:
   - Non-displaced: single horizontal dashed line
   - Displaced: horizontal to bend point + diagonal to annotation
4. **SVG dimensions**: computed from `pullbackPx` (existing), bend point position (computed from constants), and vertical displacement from `layoutMap`.

The inline editing input (currently rendered directly in `.right-annotation-column` without a `.right-annotation-actions-wrapper`) will need to be wrapped in a positioned container so it can receive a computed `top` value like other annotations.

The `height: 0; overflow: visible` approach on `.right-annotation-column` is preserved — annotations still visually overflow below their line, but to a coordinated position.

### Context re-render note

Adding `layoutMap` to `LyricSheetContext` means all context consumers re-render when layout changes. Since layout recalculates on every editor update, this could cause unnecessary re-renders of components that only use `state`, `dispatch`, or `editingNote`. For initial implementation this is acceptable — if profiling reveals jank, `layoutMap` can be split into its own `AnnotationLayoutContext` to isolate re-renders.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAnnotationLayout.js` | **New** — measurement + stacking algorithm |
| `src/context/LyricSheetContext.jsx` | Add `layoutMap` state + `setLayoutMap` setter to context value |
| `src/editor/nodeviews/AnnotatedLineView.jsx` | Read `layoutMap`, apply computed positions, SVG leader line |
| `src/editor/nodeviews/AnnotatedLineView.css` | Remove `.leader-bridge` CSS rules, add SVG leader styles |
| `src/pages/SongEditor.jsx` | `SongEditorInner` calls `useAnnotationLayout`, passes to context via `setLayoutMap` |
| `src/print.css` | Remove unused `.leader-bridge` print rules if any |
| `TODO.md` | Add Approach B (shared annotation rail) as future improvement |

## Future Work

- **Page-break awareness**: design a strategy for annotations that would cross page boundaries (stop at bottom, jump to next page, or split).
- **Approach B refactor**: move all annotation rendering to a shared `AnnotationRail` component for cleaner layout ownership.
- **Performance**: if the coordinator causes noticeable jank with many annotations, consider throttling or virtualizing the measurement pass.
