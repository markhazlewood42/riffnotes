### Bug fixes + improvements

- [broken] Combining lines or paragraphs when the lines contain right annotations
- [bug] Print view doesn't quite match editor view. Print view is slightly longer.
- [bug] Difficult to click on words with a leader line below them. Hit box is off.
- [improvement] Double spaces have too much space. Not sure what to do about this.

### New features / housekeeping

- Integration test harness for Find a Song modal — mock Genius/LRCLIB API responses, test search flow, error states (network failure, no results, lyrics unavailable), keyboard navigation, and Add Song action
- Extract hardcoded pixel values across the codebase into named constants or CSS custom properties
- Admin panel: replace plain HTML table with a proper sortable table component (HeroUI Table was buggy)
- More actions on image annotations. Allow text notes to be entered above or below the image.
- Remove image from storage bucket on deletion.
- **Architecture: Shared Annotation Rail (Approach B)** — move all right-column annotation rendering from individual AnnotatedLineView NodeViews into a single AnnotationRail overlay component. This would simplify layout coordination (single component handles stacking) and enable features like drag-to-reorder. Deferred in favor of Approach A (coordinator) for initial implementation.
- Page-break-aware annotation stacking — handle annotations that would cross page boundaries

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
