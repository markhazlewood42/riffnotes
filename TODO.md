### Before alpha

_(nothing blocking)_

### Later

- Admin panel: replace plain HTML table with a proper sortable table component (HeroUI Table was buggy)
- SaaS analytics
- More actions on image annotations. Allow text notes to be entered above or below the image.
- Remove image from storage bucket on deletion.
- Improve right annotation rendering to support better vertical stacking and avoid overlapping
  - Redesign connectors to bend when needed
- Multi-user collaboration??
- Improve rendering of longer staff images

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
