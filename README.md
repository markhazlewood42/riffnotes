# GigNotes

A web app for annotating song lyrics with chords, performance notes, and more — built for musicians preparing for gigs and rehearsals.

**Website:** [gig-notes.com](https://gig-notes.com)

## Tech Stack

- **React 18** + **TipTap v3** (ProseMirror-based rich text editor)
- **Supabase** for authentication (Google OAuth) and PostgreSQL database
- **React Router v6** for client-side routing
- **Vercel** for deployment

## Features

- **Chord annotations** — positioned above lyrics at precise character offsets using DOM Range measurement
- **Right-side performance notes** — with leader lines anchored to text positions
- **Multi-song support** — song browser with card grid, create/delete songs
- **Auto-save** — debounced saves to Supabase on every edit
- **Google sign-in** — per-user data with row-level security
- **Print-ready** — clean print layout with `@media print` styles
- **Google Docs paste handling** — clean import of lyrics from Google Docs

## Getting Started

### Prerequisites

- Node.js (v16+)
- A [Supabase](https://supabase.com) project

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the database migration in your Supabase SQL Editor:
   ```bash
   # Paste the contents of supabase/migration.sql
   ```

4. Enable Google Auth in Supabase Dashboard (Authentication > Providers > Google)

5. Start the dev server:
   ```bash
   npm start
   ```

## Architecture

### Two-layer data model

1. **TipTap document** — manages text structure (lyric lines, song title), persisted as JSON
2. **AnnotationStore** — a flat `{ [id]: annotation }` map in React Context, persisted alongside the document

Both layers are stored in a single `songs` table in Supabase with row-level security.

### Key components

| Component | Role |
|-----------|------|
| `LyricEditor.jsx` | TipTap editor with custom extensions |
| `AnnotatedLineView.jsx` | React NodeView rendering chords + right-side notes per line |
| `AnnotationToolbar.jsx` | BubbleMenu for adding annotations on text selection |
| `LyricSheetContext.js` | Annotation state + auto-save to Supabase |
| `AuthContext.js` | Google OAuth via Supabase Auth |
| `SongBrowser.jsx` | Song grid with create/delete |
| `SongEditor.jsx` | Loads a song and wraps editor in context |

### Project structure

```
src/
  supabase.js                    # Supabase client
  context/
    AuthContext.js               # Auth provider (Google OAuth)
    LyricSheetContext.js         # Annotation state + auto-save
    annotationReducer.js         # Reducer + selectors
  pages/
    LoginPage.jsx                # Google sign-in
    SongBrowser.jsx              # Song card grid
    SongEditor.jsx               # Song loading + editor wrapper
  components/
    GlobalToolbar.jsx            # Sticky header (nav, user, actions)
    ProtectedRoute.jsx           # Auth guard
  editor/
    LyricEditor.jsx              # TipTap editor setup
    extensions/
      LyricLine.js               # Custom paragraph with lineId
      SongTitle.js               # Title node
      WordHover.js               # Hover extension
    nodeviews/
      AnnotatedLineView.jsx      # Chord + note rendering per line
  toolbar/
    AnnotationToolbar.jsx        # Bubble menu
    inputs/
      ChordInput.jsx             # Chord label input
  styles/
    variables.css                # Design tokens
    annotations.css              # Annotation styles
```

## Deployment

Deployed to Vercel as a static SPA. The `vercel.json` rewrites all routes to `index.html` for client-side routing.

Environment variables needed in Vercel:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## Scripts

```bash
npm start        # Dev server at http://localhost:3000
npm run build    # Production build
npm test         # Run tests (Jest)
```
