# GigNotes

A React-based web app for annotating song lyrics with performance notes for band practice.

**Website:** [gig-notes.com](https://gig-notes.com)

## Current Status: Working Prototype

A functional lyrics editor with multi-layer annotation system. Built with:
- **React 18** for the framework
- **TipTap v3.19.0** (ProseMirror-based) for the rich text editor
- **Two-layer architecture**: TipTap doc for lyrics/structure + separate AnnotationStore for performance notes
- **Minimal, clean UI** inspired by Google Docs

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd gignotes
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Current Features

### Editor Basics
- ✅ Clean, minimal TipTap-based editor
- ✅ Text formatting (bold, italic)
- ✅ Bubble menu toolbar on text selection
- ✅ Placeholder text for empty document

### Annotation System
- ✅ **Chords** - positioned above lyrics at specific character offsets (click to delete)
- ✅ **Performance Notes** - right-aligned notes with leader lines anchored to text position
  - Multiple style variants (default, emphasis, etc.)
  - Supports character offset anchoring for precise alignment
- ✅ **Sticking Patterns** - for drum notation (R/L patterns)
- ✅ **Counting** - rhythmic counting annotations
- ✅ **Section Markers** - verse, chorus, bridge, etc.
- ✅ **Section Repeat References** - "repeat chorus", etc.

### Architecture
- ✅ Custom TipTap extensions (LyricLine, SongTitle, SectionMarker, SectionRepeatRef)
- ✅ React NodeView for rendering annotated lines
- ✅ Separate annotation store (React Context + useReducer)
- ✅ LocalStorage persistence for annotations
- ✅ Annotations linked to lines via `lineId` attribute

## Next Steps

1. **Staff notation snippets** - Embed musical notation images alongside lyrics
2. **ProseMirror Decoration-based chords** - More precise chord positioning (currently uses `ch` units)
3. **Multiple documents** - Save/load multiple song sheets
4. **PDF export** - Print-ready formatted sheet music
5. **Improved chord rendering** - Pixel-perfect positioning instead of character-width units

## Project Structure

```
gignotes/
├── public/
│   └── index.html
├── src/
│   ├── App.js                              # Main application component
│   ├── index.js                            # Entry point
│   ├── context/
│   │   ├── LyricSheetContext.js           # React Context provider
│   │   └── annotationReducer.js           # State management for annotations
│   ├── editor/
│   │   ├── LyricEditor.jsx                # Main editor component
│   │   ├── extensions/
│   │   │   ├── LyricLine.js               # Custom paragraph extension
│   │   │   ├── SongTitle.js               # Title node extension
│   │   │   ├── SectionMarker.js           # Section marker extension
│   │   │   └── SectionRepeatRef.js        # Repeat reference extension
│   │   └── nodeviews/
│   │       └── AnnotatedLineView.jsx      # React NodeView for annotated lines
│   ├── toolbar/
│   │   ├── AnnotationToolbar.jsx          # Bubble menu toolbar
│   │   └── inputs/
│   │       ├── ChordInput.jsx
│   │       ├── RightNoteInput.jsx
│   │       ├── SectionTypeSelector.jsx
│   │       ├── StickingInput.jsx
│   │       └── CountingInput.jsx
│   └── styles/
│       ├── variables.css
│       └── annotations.css
└── package.json
```

## Technical Notes

### TipTap v3 Implementation
- **BubbleMenu** imported from `@tiptap/react/menus` (v3 change - NOT from extension package)
- **LyricLine extends Paragraph** to avoid ProseMirror schema conflicts
- Uses `ReactNodeViewRenderer` for custom line rendering with annotations

### Annotation Architecture
- **Two-layer data model**: TipTap manages document structure, separate store manages annotations
- **Annotations linked by lineId**: Each LyricLine node has a unique `lineId` attribute
- **LocalStorage persistence**: Annotations auto-save to `lyricSheetState` key
- **Chord positioning**: Uses `ch` units (character width) - approximate but works for serif fonts

### Known Quirks
- Selection loss on toolbar clicks prevented via `onMouseDown` + `e.preventDefault()`
- Selection context captured in ref before input components render
- Right note leader lines use measured pullback for precise alignment
