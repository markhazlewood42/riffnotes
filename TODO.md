### Bug fixes + improvements

- [bug] Print view doesn't quite match editor view. Print view is slightly longer.
- [improvement] Leader line sub-line pinning — see entry in "New features / housekeeping" above.
- [improvement] Double spaces have too much space. Not sure what to do about this.

### New features / housekeeping

- Integration test harness for Find a Song modal — mock Genius/LRCLIB API responses, test search flow, error states (network failure, no results, lyrics unavailable), keyboard navigation, and Add Song action
- Extract hardcoded pixel values across the codebase into named constants or CSS custom properties
- Admin panel: replace plain HTML table with a proper sortable table component (HeroUI Table was buggy)
- More actions on image annotations. Allow text notes to be entered above or below the image.
- Remove image from storage bucket on deletion.
- Page-break-aware annotation stacking — handle annotations that would cross page boundaries

- **Leader line sub-line pinning** — when `Shift+Enter` (hardBreak) is inserted *before* an annotation's `charOffset`, the annotated character moves to a second visual sub-line within the paragraph. The tick currently falls back to the leader-container edge (end of first sub-line) rather than following the character. The invariant — tick is always pixel-pinned to the character at `charOffset` through any document transformation — is not met for this case.
  - Approach: (1) after computing `rangeRect` in `measureAllPullbacks`, detect which visual sub-line the character is on by comparing `rangeRect.top` to `firstLineGlyphTop`; (2) expose the sub-line index and its `top` offset to the SVG renderer in `AnnotatedLineView`; (3) shift the SVG `top` from `-(VERTICAL_TICK_HEIGHT - 3)px` to `(subLineOffset) - (VERTICAL_TICK_HEIGHT - 3)px` so the tick draws on the correct row; (4) compute pullback relative to the sub-line's own left edge rather than the wrapper-right edge. The measurement infrastructure is already in `measureAllPullbacks` (`src/editor/nodeviews/AnnotatedLineView.jsx`) — the gap is propagating the sub-line offset through to the SVG style.
  - Playwright test exists: `e2e/right-side-annotations.spec.js` → "leader line tick does not span document when Shift+Enter moves annotation character to sub-line". Upgrade its assertion from a loose bounds check to `Math.abs(tickX - charX) < 5` once implemented.

- **Architecture: Shared Annotation Rail (Approach B)** — move all right-column annotation rendering from individual AnnotatedLineView NodeViews into a single AnnotationRail overlay component. This would simplify layout coordination (single component handles stacking) and enable features like drag-to-reorder. Deferred in favor of Approach A (coordinator) for initial implementation.

### Big ideas

- Multi-user collaboration??
- Better SaaS analytics
- **Unified undo/redo — migrate annotations into the TipTap document model.**
  Annotations currently live in a separate React Context/reducer with no undo history.
  Moving them to ProseMirror node attributes on LyricLine (e.g. `node.attrs.annotations`)
  would give a single undo stack via ProseMirror's history plugin. Key work:
  - Add `annotations` attribute to `LyricLine` extension
  - Replace `dispatch()` calls with TipTap commands that create ProseMirror transactions
  - Persistence: embed in document JSON or extract at save time
  - `AnnotatedLineView` reads from `node.attrs` instead of context
  - Handle async image upload outside history (blob→URL swap shouldn't be undoable)
  - Database migration for existing songs

- Embedded musical notation editor to create staff annotations, instead of just pasting images.
