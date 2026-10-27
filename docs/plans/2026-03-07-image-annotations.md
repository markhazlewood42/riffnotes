---
type: project-doc
title: RiffNotes — Image Annotations Implementation Plan
project: riffnotes
created: 2026-03-07
updated: 2026-08-26
tags: [plan, annotations]
---

# Image Annotations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add image annotation support to the right-side annotation column, allowing users to paste image snippets from the clipboard while editing a note.

**Architecture:** New annotation type `'image'` with `dataUrl` field (base64). Created by intercepting paste events on the existing inline note input. Rendered as a 32px-tall `<img>` in the right annotation column with leader line centered vertically. One right-side annotation per line (text OR image).

**Tech Stack:** React 19, TipTap v3 (ProseMirror), plain JS/JSX, CSS, Supabase JSONB storage

**Design doc:** `docs/plans/2026-03-07-image-annotations-design.md`

---

### Task 1: Add `ADD_IMAGE` action and `getImageForLine` selector

**Files:**
- Modify: `src/context/annotationReducer.js`

**Step 1: Add `getImageForLine` selector**

Add after `getRightNoteForLine` (line 96):

```js
function getImageForLine(state, lineId) {
  return Object.values(state.annotations).find(
    (a) => a.type === 'image' && a.lineId === lineId
  );
}
```

Update the export block to include `getImageForLine`.

**Step 2: Add helper to remove existing right-side/image annotations for a line**

Add a helper function before the reducer:

```js
function removeRightAnnotationsForLine(annotations, lineId) {
  const filtered = {};
  for (const [id, ann] of Object.entries(annotations)) {
    if (ann.lineId === lineId && (ann.type === 'right-side' || ann.type === 'image')) {
      continue;
    }
    filtered[id] = ann;
  }
  return filtered;
}
```

**Step 3: Add `ADD_IMAGE` case to reducer**

Add after the `ADD_RIGHT_NOTE` case:

```js
case 'ADD_IMAGE': {
  const id = generateId();
  const cleaned = removeRightAnnotationsForLine(state.annotations, action.payload.lineId);
  return {
    ...state,
    annotations: {
      ...cleaned,
      [id]: { id, type: 'image', ...action.payload },
    },
  };
}
```

**Step 4: Update `ADD_RIGHT_NOTE` to also enforce one-per-line**

Replace the existing `ADD_RIGHT_NOTE` case body:

```js
case 'ADD_RIGHT_NOTE': {
  const id = generateId();
  const cleaned = removeRightAnnotationsForLine(state.annotations, action.payload.lineId);
  return {
    ...state,
    annotations: {
      ...cleaned,
      [id]: { id, type: 'right-side', style: 'default', ...action.payload },
    },
  };
}
```

**Step 5: Verify**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 6: Commit**

```bash
git add src/context/annotationReducer.js
git commit -m "feat: add ADD_IMAGE action and getImageForLine selector"
```

---

### Task 2: Add image paste handler to inline note input

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.jsx`

**Step 1: Import `getImageForLine`**

Update the import at line 4:

```js
import { getRightNoteForLine, getChordsForLine, getImageForLine } from '../../context/annotationReducer';
```

**Step 2: Add paste handler function**

Add after `handleNoteCancel` (line 168):

```js
const handleNotePaste = useCallback((e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        dispatch({
          type: 'ADD_IMAGE',
          payload: {
            lineId,
            charOffset: editingNote.charOffset,
            dataUrl: reader.result,
          },
        });
        stopEditingNote();
        editorRef.current?.commands.focus();
      };
      reader.readAsDataURL(file);
      return;
    }
  }
  // If no image found, allow default text paste behavior
}, [dispatch, lineId, editingNote, stopEditingNote, editorRef]);
```

**Step 3: Attach paste handler to the input element**

Add `onPaste={handleNotePaste}` to the `<input>` element (around line 222):

```jsx
<input
  ref={noteInputRef}
  className="note-inline-input"
  type="text"
  placeholder="type note…"
  onPaste={handleNotePaste}
  onKeyDown={(e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleNoteSubmit(e.target.value); }
    else if (e.key === 'Escape') { handleNoteCancel(); }
  }}
  onBlur={(e) => {
    handleNoteCancel();
  }}
/>
```

**Step 4: Verify**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/editor/nodeviews/AnnotatedLineView.jsx
git commit -m "feat: add image paste handler to inline note input"
```

---

### Task 3: Render image annotations in the right column

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.jsx`

**Step 1: Add `imageAnnotation` memo**

Add after the `rightNote` memo (line 14):

```js
const imageAnnotation = useMemo(
  () => getImageForLine(state, lineId),
  [state, lineId]
);
```

**Step 2: Update `hasAnnotation` and `showRightColumn`**

Replace lines 44-45:

```js
const hasAnnotation = !!rightNote || !!imageAnnotation;
const showRightColumn = hasAnnotation || isEditingNote;
```

**Step 3: Update `charOffsetForLeader`**

Replace lines 48-50 to also consider image annotations:

```js
const charOffsetForLeader = isEditingNote
  ? editingNote.charOffset
  : (rightNote?.charOffset ?? imageAnnotation?.charOffset ?? null);
```

**Step 4: Add image delete handler**

Add after `handleDeleteRightNote` (line 32):

```js
const handleDeleteImage = (e) => {
  e.stopPropagation();
  if (imageAnnotation) {
    dispatch({ type: 'DELETE_ANNOTATION', payload: { id: imageAnnotation.id } });
  }
};
```

**Step 5: Update the right-column rendering with three-branch logic**

Replace the right annotation column JSX (lines 216-243) with:

```jsx
<div className="right-annotation-column" contentEditable={false}>
  {showRightColumn && (
    isEditingNote ? (
      <input
        ref={noteInputRef}
        className="note-inline-input"
        type="text"
        placeholder="type note…"
        onPaste={handleNotePaste}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleNoteSubmit(e.target.value); }
          else if (e.key === 'Escape') { handleNoteCancel(); }
        }}
        onBlur={(e) => {
          handleNoteCancel();
        }}
      />
    ) : imageAnnotation ? (
      <div
        className="right-annotation-image-container"
        title="Click to delete"
        onClick={handleDeleteImage}
      >
        <img
          className="right-annotation-image"
          src={imageAnnotation.dataUrl}
          alt="Annotation"
        />
      </div>
    ) : (
      <span
        className={`right-annotation-text ${styleClass}`}
        title="Click to delete"
        onClick={handleDeleteRightNote}
      >
        {rightNote.value}
      </span>
    )
  )}
</div>
```

**Step 6: Verify**

Run: `npm run build`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add src/editor/nodeviews/AnnotatedLineView.jsx
git commit -m "feat: render image annotations in right annotation column"
```

---

### Task 4: Add image annotation CSS

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.css`

**Step 1: Add image annotation styles**

Add after the `.note-inline-input::placeholder` rule (line 133):

```css
/* Image annotation — fixed 32px height, proportional width, clipped at column edge */
.right-annotation-image-container {
  position: absolute;
  top: 0;
  left: 16px;
  max-width: calc(100% - 16px);
  overflow: hidden;
  cursor: pointer;
}

.right-annotation-image-container:hover {
  opacity: 0.8;
}

.right-annotation-image {
  height: 32px;
  width: auto;
  border: 0.5px solid var(--color-right-annotation);
  box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);
  display: block;
}
```

**Step 2: Add leader line vertical centering for image annotations**

The leader bridge currently has `top: 3px` for baseline alignment with text. For images, the leader should center vertically at 16px (half of 32px). Add a modifier class:

```css
/* When the line has an image annotation, center leader line on the image */
.annotated-line.has-image-annotation .leader-bridge {
  top: 16px;
}
```

**Step 3: Verify**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/editor/nodeviews/AnnotatedLineView.css
git commit -m "feat: add image annotation and leader line centering styles"
```

---

### Task 5: Add `has-image-annotation` class to annotated line

**Files:**
- Modify: `src/editor/nodeviews/AnnotatedLineView.jsx`

**Step 1: Update NodeViewWrapper className**

Update the `className` on `NodeViewWrapper` (around line 202) to include an image-specific class:

```jsx
<NodeViewWrapper
  className={`annotated-line ${showRightColumn ? 'has-right-annotation' : ''} ${imageAnnotation && !isEditingNote ? 'has-image-annotation' : ''}`}
  data-line-id={lineId}
>
```

**Step 2: Verify**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Manual test**

1. Start: `VITE_AUTH_BYPASS=true npx vite --port 3002`
2. Navigate to `http://localhost:3002/test`
3. Select text on a lyric line → BubbleMenu appears → click "Note"
4. While the inline input is focused, copy an image to clipboard (e.g., screenshot), then Ctrl+V
5. Expected: image appears in right annotation column at 32px height, purple border, drop shadow
6. Expected: leader line connects from text to image, centered vertically on image
7. Click image → expected: image annotation deleted
8. Test that pasting text still works normally (type "hello", paste text → text appears in input)

**Step 4: Commit**

```bash
git add src/editor/nodeviews/AnnotatedLineView.jsx
git commit -m "feat: add has-image-annotation class for leader line centering"
```

---

### Task 6: Final integration test and cleanup

**Step 1: Full manual test checklist**

Using test server at `http://localhost:3002/test`:

- [ ] Paste image → image annotation created with leader line
- [ ] Paste text → text note created (existing behavior unchanged)
- [ ] Image has purple border and drop shadow
- [ ] Image is 32px tall, width proportional
- [ ] Image clipped at right edge of annotation column if too wide
- [ ] Leader line centers vertically on image (not baseline-aligned)
- [ ] Click image → deleted
- [ ] Add text note to line, then add image → text note replaced by image
- [ ] Add image to line, then add text note → image replaced by text note
- [ ] Multiple lines can each have their own image annotations
- [ ] Page breaks still work correctly with image annotations present
- [ ] Print preview: images visible, no styling artifacts

**Step 2: Final commit**

If any fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "fix: polish image annotation rendering and edge cases"
```

**Step 3: Push feature branch**

```bash
git push
```
