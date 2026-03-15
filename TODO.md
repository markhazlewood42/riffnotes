### Before alpha

_(nothing blocking)_

### Later

- Admin panel: replace plain HTML table with a proper sortable table component (HeroUI Table was buggy)
- SaaS analytics
- More actions on image annotations. Allow text notes to be entered above or below the image.
- Remove image from storage bucket on deletion.
- **Architecture: Shared Annotation Rail (Approach B)** — move all right-column annotation rendering from individual AnnotatedLineView NodeViews into a single AnnotationRail overlay component. This would simplify layout coordination (single component handles stacking) and enable features like drag-to-reorder. Deferred in favor of Approach A (coordinator) for initial implementation.
- Page-break-aware annotation stacking — handle annotations that would cross page boundaries
- Multi-user collaboration??
- Improve rendering of longer staff images
- Extract hardcoded pixel values across the codebase into named constants or CSS custom properties

### Big ideas

- **Unified undo/redo — migrate annotations into the TipTap document model.**
  Annotations currently live in a separate React Context/reducer with no undo history.
  Moving them to ProseMirror node attributes on LyricLine (e.g. `node.attrs.annotations`)
  would give a single undo stack via ProseMirror's history plugin. Key work:
  - Add `annotations` attribute to `LyricLine` extension
  - Replace `dispatch()` calls with TipTap commands that create ProseMirror transactions
  - `AnnotatedLineView` reads from `node.attrs` instead of context
  - Persistence: embed in document JSON or extract at save time
  - Handle async image upload outside history (blob→URL swap shouldn't be undoable)
  - Database migration for existing songs

- Embedded musical notation editor to create staff annotations, instead of just pasting images.
