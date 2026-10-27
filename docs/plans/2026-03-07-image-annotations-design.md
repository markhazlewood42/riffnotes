---
type: project-doc
title: RiffNotes — Image Annotations Design
project: riffnotes
created: 2026-03-07
updated: 2026-08-26
tags: [design, annotations]
---

# Image Annotations Design

## Summary

Add image annotation support to the right-side annotation column. Users paste image snippets (e.g., sheet music notation) from the clipboard while editing a text note. Images render at fixed 32px height with proportional width, styled with a purple border and drop shadow per the Figma mockup.

## Data Model

New annotation type `'image'` alongside `'chord'` and `'right-side'`:

```js
{
  id: 'ann-xxx',
  type: 'image',
  lineId: 'line-abc',
  charOffset: 5,
  dataUrl: 'data:image/png;base64,...',
}
```

- `dataUrl` stores base64-encoded image data directly in the annotation JSON (Supabase JSONB column). Future migration to Supabase Storage will swap this for a `storageUrl` field.
- One right-side annotation per line (text OR image, not both). Enforced at creation time by deleting any existing `right-side` or `image` annotation on the same line before adding.
- New selector `getImageForLine(state, lineId)` returns the single image annotation for a line.

## Creation Flow

1. User selects text in lyrics, BubbleMenu appears.
2. User clicks "Note" button, `startEditingNote(lineId, charOffset)` fires, inline text input appears (existing flow).
3. While input is focused, user pastes from clipboard.
4. `onPaste` handler checks `clipboardData.items` for image MIME types.
5. If image found: read as base64 via `FileReader`, dispatch `ADD_IMAGE` with `{ lineId, charOffset, dataUrl }`, call `stopEditingNote()`.
6. If no image in clipboard: existing text paste behavior continues unchanged.
7. Any text already in the input is discarded when an image is pasted.

## Reducer Changes (annotationReducer.js)

- New action `ADD_IMAGE` creates annotation with `type: 'image'`.
- Before adding any right-side or image annotation, delete existing right-side/image annotations on the same line.
- New selector `getImageForLine(state, lineId)` filters by `type === 'image'`.

## Rendering (AnnotatedLineView.jsx)

Priority order in the right annotation column:

```
if (editingNote)      -> render inline input (with paste handler)
else if (image)       -> render image element
else if (rightNote)   -> render text note
```

### Image element

- `<img>` with `height: 32px`, `width: auto`
- Purple border: `0.5px solid var(--color-right-annotation)`
- Drop shadow: `0px 2px 2px rgba(0, 0, 0, 0.25)`
- Container clipped at column edge: `overflow: hidden`
- Click to delete (same UX as text notes)

### Leader line

Same `.leader-bridge` dashed line as text notes, but vertically centered on the image (center at 16px from top of annotation area) instead of baseline-aligned with lyrics.

## Styling

```css
.right-annotation-image-container {
  position: absolute;
  top: 0;
  left: 16px;
  max-width: calc(100% - 16px);
  overflow: hidden;
}

.right-annotation-image {
  height: 32px;
  width: auto;
  border: 0.5px solid var(--color-right-annotation);
  box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  display: block;
}
```

## Print

Base64 data URLs render natively in print. Existing print CSS applies. No special handling needed.

## Deferred

- Multiple annotations per line / vertical stacking strategy
- Upload from disk (file picker)
- Migration from base64 to Supabase Storage
- Image resizing / cropping UI
- Alt text / captions
