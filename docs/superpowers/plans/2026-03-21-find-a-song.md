---
type: project-doc
title: RiffNotes — Find a Song Plan
project: riffnotes
created: 2026-03-21
updated: 2026-08-26
tags: [plan, search]
---

# Find a Song Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users search for songs by title/artist and auto-populate a new song document with the found lyrics, instead of manually typing everything.

**Architecture:** The SongBrowser's "New Song" button becomes a dropdown with two options: "New blank song" (existing behavior) and "Find a song" (opens a search modal). The modal uses a split-pane layout — search + results on the left, lyrics preview on the right. The search queries the LRCLIB API (free, no auth, returns full lyrics) for track search, and the preview shows the selected song's lyrics in a miniature document-like format. On "Add song", we construct a TipTap document JSON, INSERT directly into Supabase from SongBrowser, and navigate to the editor at `/songs/{new-id}` — this avoids modifying SongEditor per the spec constraint.

**Song title format:** "Artist - Track" (e.g., "System of a Down - Aerials"). May change later.

**Tech Stack:** React 19, HeroUI v3 beta (Dropdown, Modal, SearchField, ListBox, Button, Separator), LRCLIB API (`lrclib.net`), Lucide React icons, existing Tailwind v4 + CSS.

**API Choice: LRCLIB**
- Endpoint: `GET https://lrclib.net/api/search?q={query}`
- No auth required, no API key
- Returns: `{ id, trackName, artistName, albumName, duration, plainLyrics, syncedLyrics }`
- Full lyrics in `plainLyrics` field — no second API call needed
- Open source (MIT), free, community-maintained
- Rate limit: be polite (debounce searches at 400ms)
- Note: browsers strip custom `User-Agent` headers from fetch; use default

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/services/lrclib.js` | Create | LRCLIB API client — `searchSongs(query)` function with AbortController support |
| `src/services/songDocument.js` | Create | `buildDocumentFromLyrics(title, lyrics)` — constructs TipTap document JSON |
| `src/components/FindSongModal.jsx` | Create | Modal with search input, results list, lyrics preview, cancel/add buttons |
| `src/components/FindSongModal.css` | Create | Modal layout styles (split pane, preview, results list) |
| `src/components/NewSongDropdown.jsx` | Create | Dropdown button replacing the "New Song" button |
| `src/pages/SongBrowser.jsx` | Modify | Replace Button with NewSongDropdown, wire up modal + Supabase INSERT |
| `src/pages/SongEditor.jsx` | No changes | Spec constraint: "NO CHANGES TO SONG EDITOR for now" |
| `src/editor/LyricEditor.jsx` | Read only | Reference for document JSON structure |

---

### Task 1: LRCLIB API Client

**Files:**
- Create: `src/services/lrclib.js`

- [ ] **Step 1: Create the LRCLIB API client**

```javascript
// src/services/lrclib.js
const LRCLIB_BASE = 'https://lrclib.net/api';

/**
 * Search for songs by query string (title, artist, or both).
 * Returns array of { id, trackName, artistName, albumName, duration, plainLyrics }.
 */
export async function searchSongs(query, { signal } = {}) {
  if (!query || query.trim().length < 2) return [];

  const url = `${LRCLIB_BASE}/search?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`LRCLIB search failed: ${res.status}`);
  }

  const data = await res.json();

  // Filter out instrumentals / entries without lyrics, then deduplicate
  // by trackName + artistName (LRCLIB often returns multiple versions).
  // Keeping first match (which has lyrics) per unique key.
  const seen = new Set();
  return data
    .filter((item) => item.plainLyrics)
    .filter((item) => {
      const key = `${item.trackName?.toLowerCase()}|${item.artistName?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
```

- [ ] **Step 2: Manually test in browser console**

Open dev tools on `localhost:3000` and run:
```javascript
fetch('https://lrclib.net/api/search?q=green+day+21+guns').then(r => r.json()).then(console.log)
```
Verify: array of results with `trackName`, `artistName`, `plainLyrics` fields populated.

- [ ] **Step 3: Commit**

```bash
git add src/services/lrclib.js
git commit -m "feat: add LRCLIB API client for song search"
```

---

### Task 2: NewSongDropdown Component

**Files:**
- Create: `src/components/NewSongDropdown.jsx`

This replaces the existing "+ New Song" Button. It's a HeroUI Dropdown with a trigger Button showing a music note icon + "New" + chevron, and two items: "New blank song" and "Find a song".

**Figma reference:** Button shows music note icon + "New" + down chevron (accent color). Dropdown has 240px width, two items each with icon + title + description text.

- [ ] **Step 1: Create the dropdown component**

```jsx
// src/components/NewSongDropdown.jsx
import { Button, Dropdown } from '@heroui/react';
import { ChevronDown, FileText, Music, Search } from 'lucide-react';

function NewSongDropdown({ onNewBlank, onFindSong }) {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button color="accent">
          <Music size={16} />
          New
          <ChevronDown size={16} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content className="new-song-dropdown-content">
        <Dropdown.Item
          key="blank"
          startContent={<FileText size={16} />}
          description="Fill in the lyrics yourself"
          onPress={onNewBlank}
        >
          New blank song
        </Dropdown.Item>
        <Dropdown.Item
          key="find"
          startContent={<Search size={16} />}
          description="Let RiffNotes find the lyrics"
          onPress={onFindSong}
        >
          Find a song
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  );
}

export default NewSongDropdown;
```

> **Note:** HeroUI v3 Dropdown API may differ from above. Check `mcp__heroui-react__get_component_docs` for Dropdown before implementing. The component may use `Dropdown.Menu` and `Dropdown.MenuItem` instead. Adapt to the actual API. If the Dropdown component is broken in v3 beta (like Table was), fall back to a simple popover with two clickable rows using the Popover component or custom CSS.

- [ ] **Step 2: Wire into SongBrowser**

In `src/pages/SongBrowser.jsx`:
- Replace `import { Button, Card, Spinner } from "@heroui/react"` — keep Button for other uses if needed
- Import `NewSongDropdown`
- Add state: `const [findModalOpen, setFindModalOpen] = useState(false);`
- Replace the `<Button color="accent" onPress={createSong}>` with:
  ```jsx
  <NewSongDropdown
    onNewBlank={createSong}
    onFindSong={() => setFindModalOpen(true)}
  />
  ```
- Simplify the empty state: remove the "Create your first song" `<Button>` CTA. Replace with just an illustration and text — the "New" dropdown in the header is sufficient. Example:
  ```jsx
  <div className="song-browser-empty">
    <Music size={40} opacity={0.3} />
    <p>No songs yet</p>
  </div>
  ```

- [ ] **Step 3: Verify dropdown renders and "New blank song" still works**

Run `npm run dev`, navigate to `/`. Verify:
- Accent-colored "New" button with dropdown arrow
- Click opens dropdown with two options
- "New blank song" navigates to `/songs/new` (existing behavior preserved)
- "Find a song" sets `findModalOpen` to true (modal not yet built — verify via React DevTools or console.log)

- [ ] **Step 4: Commit**

```bash
git add src/components/NewSongDropdown.jsx src/pages/SongBrowser.jsx
git commit -m "feat: replace New Song button with dropdown menu"
```

---

### Task 3: FindSongModal — Layout & Search

**Files:**
- Create: `src/components/FindSongModal.jsx`
- Create: `src/components/FindSongModal.css`
- Modify: `src/pages/SongBrowser.jsx` (add modal rendering)

The modal is a large centered overlay (~860x630 inner content area) with:
- Left pane (fixed ~383px): search input + horizontal separator + results list or empty state
- Vertical separator
- Right pane (remaining ~383px): lyrics preview or empty state
- Footer: Cancel + Add song buttons

**Figma reference:** Three states — empty (music note icon), search results (list items with title bold + artist muted), song selected (mini document preview with title + lyrics).

- [ ] **Step 1: Create the modal component with search input and empty state**

```jsx
// src/components/FindSongModal.jsx
import { Button, Modal } from '@heroui/react';
import { FileText, Music, Search, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { searchSongs } from '../services/lrclib';
import './FindSongModal.css';

const DEBOUNCE_MS = 400;

function FindSongModal({ isOpen, onClose, onAddSong }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setQuery(value);
    setSelectedSong(null);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!value || value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      try {
        const data = await searchSongs(value, { signal: abortRef.current.signal });
        setResults(data);
      } catch (err) {
        if (err.name === 'AbortError') return; // stale request, ignore
        console.error('Song search failed:', err);
        setError('Could not reach the song database. Check your connection and try again.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSelectedSong(null);
    setError(null);
    onClose();
  };

  const handleAddSong = () => {
    if (!selectedSong) return;
    onAddSong(selectedSong);
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="4xl"
      hideCloseButton
      classNames={{ wrapper: 'find-song-modal-wrapper' }}
    >
      <Modal.Content className="find-song-modal">
        <button className="find-song-close" onClick={handleClose}>
          <X size={16} />
        </button>

        <div className="find-song-body">
          {/* Left pane: search + results */}
          <div className="find-song-left">
            <div className="find-song-search-field">
              <div className="find-song-search-input-wrapper">
                <Search size={16} className="find-song-search-icon" />
                <input
                  type="text"
                  className="find-song-search-input"
                  placeholder="Find a song ..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
                {query && (
                  <button
                    className="find-song-clear"
                    onClick={() => handleSearch('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <p className="find-song-search-hint">
                Search for a song by title or artist
              </p>
            </div>

            <div className="find-song-separator-h" />

            {/* Results list or empty state */}
            <div className="find-song-results-area">
              {error && <p className="find-song-error">{error}</p>}
              {!error && results.length === 0 && !searching && (
                <div className="find-song-empty-state">
                  <Music size={40} />
                </div>
              )}
              {searching && results.length === 0 && (
                <div className="find-song-empty-state">
                  <p className="find-song-searching-text">Searching...</p>
                </div>
              )}
              {results.length > 0 && (
                <div className="find-song-results-list">
                  {results.map((song) => (
                    <button
                      key={song.id}
                      className={`find-song-result-item${selectedSong?.id === song.id ? ' selected' : ''}`}
                      onClick={() => setSelectedSong(song)}
                    >
                      <span className="find-song-result-title">
                        {song.trackName}
                      </span>
                      <span className="find-song-result-artist">
                        {song.artistName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vertical separator */}
          <div className="find-song-separator-v" />

          {/* Right pane: preview */}
          <div className="find-song-right">
            {!selectedSong ? (
              <div className="find-song-preview-empty">
                <FileText size={20} />
                <p>Preview</p>
              </div>
            ) : (
              <div className="find-song-preview">
                <div className="find-song-preview-doc">
                  <h3 className="find-song-preview-title">
                    {selectedSong.artistName} - {selectedSong.trackName}
                  </h3>
                  <div className="find-song-preview-lyrics">
                    {selectedSong.plainLyrics}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="find-song-footer">
          <Button variant="secondary" onPress={handleClose} size="sm">
            Cancel
          </Button>
          <Button
            color="accent"
            onPress={handleAddSong}
            size="sm"
            isDisabled={!selectedSong}
          >
            Add song
          </Button>
        </div>
      </Modal.Content>
    </Modal>
  );
}

export default FindSongModal;
```

> **Note:** Check HeroUI v3 Modal API via `mcp__heroui-react__get_component_docs` before implementing. The Modal compound component structure may differ (e.g., `Modal.Header`, `Modal.Body`, `Modal.Footer`). The search input is intentionally a plain `<input>` rather than HeroUI SearchField to avoid potential v3 beta issues and keep full control over the debounce behavior. If SearchField works well, it can be swapped in.

- [ ] **Step 2: Create the CSS for the modal**

```css
/* src/components/FindSongModal.css */

:root {
  --find-song-pane-width: 383px;
  --find-song-modal-height: 630px;
  --find-song-preview-width: 287px;
}

.find-song-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 48px 24px 24px;
  max-height: 80vh;
  height: var(--find-song-modal-height);
  position: relative;
  border-radius: 24px;
  overflow: hidden;
}

.find-song-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: var(--default-default, #ebebec);
  border: none;
  border-radius: 12px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  z-index: 1;
}

.find-song-body {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

/* Left pane */
.find-song-left {
  width: var(--find-song-pane-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.find-song-search-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.find-song-search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 8px 12px;
  border-radius: 12px;
  background: var(--field-background, white);
  box-shadow: 0px 2px 4px rgba(0,0,0,0.04), 0px 1px 2px rgba(0,0,0,0.06), 0px 0px 1px rgba(0,0,0,0.06);
}

.find-song-search-icon {
  color: var(--foreground-muted, #71717a);
  flex-shrink: 0;
}

.find-song-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  line-height: 20px;
  background: transparent;
  color: var(--field-foreground, #18181b);
  font-family: inherit;
}

.find-song-search-input::placeholder {
  color: var(--field-placeholder, #71717a);
}

.find-song-clear {
  background: var(--default-default, #ebebec);
  border: none;
  border-radius: 10px;
  padding: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.find-song-search-hint {
  font-size: 12px;
  line-height: 1.34;
  color: var(--foreground-muted, #71717a);
  padding: 4px;
}

.find-song-separator-h {
  height: 1px;
  background: var(--border-subtle, #e4e4e7);
  flex-shrink: 0;
}

.find-song-separator-v {
  width: 1px;
  background: var(--border-subtle, #e4e4e7);
  flex-shrink: 0;
}

/* Results area */
.find-song-results-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.find-song-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--foreground-muted, #71717a);
  opacity: 0.3;
}

.find-song-searching-text {
  font-size: 12px;
  color: var(--foreground-muted, #71717a);
  opacity: 1;
}

.find-song-error {
  font-size: 12px;
  color: var(--danger-danger, #ff383c);
  padding: 12px;
}

.find-song-results-list {
  display: flex;
  flex-direction: column;
}

.find-song-result-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 12px;
  min-height: 36px;
  border: none;
  background: transparent;
  border-radius: 20px;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.find-song-result-item:hover {
  background: var(--default-default-hover, #f4f4f5);
}

.find-song-result-item.selected {
  outline: 2px solid var(--accent-accent);
  outline-offset: -2px;
}

.find-song-result-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.43;
  color: var(--foreground-foreground, #18181b);
}

.find-song-result-artist {
  font-size: 12px;
  line-height: 1.34;
  color: var(--foreground-muted, #71717a);
}

/* Right pane */
.find-song-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.find-song-preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--foreground-muted, #71717a);
  opacity: 0.3;
}

.find-song-preview-empty p {
  font-size: 12px;
}

.find-song-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
}

.find-song-preview-doc {
  width: var(--find-song-preview-width);
  max-height: 100%;
  overflow-y: auto;
  background: white;
  box-shadow: 1px 1px 4px rgba(0,0,0,0.1);
  padding: 12px 24px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.find-song-preview-title {
  font-family: var(--heading-family-sans, 'Blinker', sans-serif);
  font-weight: 700;
  font-size: 10px;
  line-height: 1.2;
  color: var(--text-subtle, #3f3f46);
}

.find-song-preview-lyrics {
  font-family: 'Montserrat', sans-serif;
  font-size: 5px;
  font-weight: 500;
  line-height: 1.8;
  color: black;
  white-space: pre-wrap;
  border-right: 0.5px solid var(--border-subtle, #d0d0d4);
  padding-right: 4px;
}

/* Footer */
.find-song-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Dark mode */
.dark .find-song-search-input-wrapper {
  background: var(--field-background, #27272a);
}

.dark .find-song-preview-doc {
  background: var(--surface-surface, #27272a);
}

.dark .find-song-preview-lyrics {
  color: var(--foreground-foreground, #fafafa);
}
```

- [ ] **Step 3: Wire the modal into SongBrowser**

In `src/pages/SongBrowser.jsx`, add:
```jsx
import FindSongModal from '../components/FindSongModal';

// Inside the component:
const [findModalOpen, setFindModalOpen] = useState(false);

const handleAddFoundSong = (song) => {
  // Navigate to /songs/new with the song data in route state
  navigate('/songs/new', {
    state: {
      prefill: {
        title: `${song.artistName} - ${song.trackName}`,
        lyrics: song.plainLyrics,
      },
    },
  });
};

// Render the modal before closing </div>:
<FindSongModal
  isOpen={findModalOpen}
  onClose={() => setFindModalOpen(false)}
  onAddSong={handleAddFoundSong}
/>
```

- [ ] **Step 4: Verify the modal opens, search works, results display, and preview shows lyrics**

Run `npm run dev`:
1. Click "New" → "Find a song" → modal opens
2. Type "green day" → debounced search → results appear with track names and artists
3. Click a result → right pane shows mini document preview with title and lyrics
4. Close button and Cancel both dismiss the modal
5. Verify search errors show an error message (disconnect internet and try)

- [ ] **Step 5: Commit**

```bash
git add src/components/FindSongModal.jsx src/components/FindSongModal.css src/pages/SongBrowser.jsx
git commit -m "feat: add Find a Song modal with LRCLIB search and preview"
```

---

### Task 4: Song Creation via Direct Supabase INSERT

**Files:**
- Create: `src/services/songDocument.js` (document builder utility)
- Modify: `src/pages/SongBrowser.jsx` (handleAddFoundSong does INSERT + navigate)

When the user clicks "Add song" in the modal, we build a TipTap document JSON from the lyrics, INSERT directly into Supabase, and navigate to `/songs/{new-id}`. This avoids modifying SongEditor (per spec: "NO CHANGES TO SONG EDITOR for now").

The TipTap document format:
```json
{
  "type": "doc",
  "content": [
    { "type": "songTitle", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Artist - Title" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "First line" }] },
    { "type": "paragraph" },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Second line" }] }
  ]
}
```

Empty lines become empty paragraphs (verse separators). `lineId` attributes are auto-assigned by the LyricLine extension on load, so we omit them from the JSON.

- [ ] **Step 1: Create the document builder utility**

```javascript
// src/services/songDocument.js

/**
 * Build a TipTap document JSON from a title and plain lyrics text.
 * Each line becomes a paragraph node; empty lines become empty paragraphs.
 */
export function buildDocumentFromLyrics(title, lyricsText) {
  const lines = lyricsText.split('\n');

  // Collapse runs of 3+ blank lines to 2 (matching paste behavior in pasteUtils.js)
  const normalized = [];
  let consecutiveEmpty = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      consecutiveEmpty++;
      if (consecutiveEmpty <= 2) normalized.push('');
    } else {
      consecutiveEmpty = 0;
      normalized.push(line.trim());
    }
  }

  // Remove trailing empty lines
  while (normalized.length > 0 && normalized[normalized.length - 1] === '') {
    normalized.pop();
  }

  const paragraphs = normalized.map((line) =>
    line
      ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
      : { type: 'paragraph' }
  );

  return {
    type: 'doc',
    content: [
      {
        type: 'songTitle',
        attrs: { level: 1 },
        content: [{ type: 'text', text: title }],
      },
      ...paragraphs,
    ],
  };
}
```

- [ ] **Step 2: Update handleAddFoundSong in SongBrowser to do direct INSERT**

In `src/pages/SongBrowser.jsx`:

```javascript
import { buildDocumentFromLyrics } from '../services/songDocument';

const handleAddFoundSong = async (song) => {
  const title = `${song.artistName} - ${song.trackName}`;
  const document = buildDocumentFromLyrics(title, song.plainLyrics);

  const { data, error } = await supabase.from('songs').insert({
    user_id: user.id,
    title,
    document,
    annotations: {},
  }).select('id').single();

  if (error) {
    console.error('Failed to create song:', error);
    return; // TODO: show error in modal
  }

  navigate(`/songs/${data.id}`);
};
```

- [ ] **Step 3: Pass `handleAddFoundSong` as async to FindSongModal and add loading state**

Update FindSongModal to support an async `onAddSong` callback:

```jsx
const [adding, setAdding] = useState(false);

const handleAddSong = async () => {
  if (!selectedSong || adding) return;
  setAdding(true);
  await onAddSong(selectedSong);
  setAdding(false);
  handleClose();
};

// Update the Add song button:
<Button
  color="accent"
  onPress={handleAddSong}
  size="sm"
  isDisabled={!selectedSong || adding}
>
  {adding ? 'Adding...' : 'Add song'}
</Button>
```

- [ ] **Step 4: Verify end-to-end flow**

Run `npm run dev`:
1. Click "New" → "Find a song"
2. Search for "knockin on heavens door"
3. Select a result → verify preview shows lyrics
4. Click "Add song" → button shows "Adding..."
5. Verify: song is created in Supabase and navigates to `/songs/{id}`
6. Verify: editor loads the full song with title and lyrics
7. Verify: the song appears in the song list on back navigation
8. Verify: SongEditor.jsx is UNCHANGED

- [ ] **Step 5: Commit**

```bash
git add src/services/songDocument.js src/pages/SongBrowser.jsx src/components/FindSongModal.jsx
git commit -m "feat: create pre-populated songs via direct Supabase INSERT"
```

---

### Task 5: Polish & Edge Cases

**Files:**
- Modify: `src/components/FindSongModal.jsx`
- Modify: `src/components/FindSongModal.css`
- Modify: `src/components/NewSongDropdown.jsx`

- [ ] **Step 1: Handle songs with no lyrics**

Some LRCLIB results have `plainLyrics: null` (instrumental tracks). Filter them out or show a disabled state:

In `src/services/lrclib.js`, add to the filter:
```javascript
return data
  .filter((item) => item.plainLyrics) // exclude instrumentals / no-lyrics entries
  .filter((item) => { /* existing dedup logic */ });
```

- [ ] **Step 2: Add keyboard navigation**

In `FindSongModal.jsx`:
- Press `Escape` closes modal (HeroUI Modal handles this by default)
- Press `Enter` when a song is selected triggers "Add song"

```javascript
// Add to the modal's root element or body:
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && selectedSong) {
    handleAddSong();
  }
};
```

- [ ] **Step 3: Handle the "no results" state**

After search completes with 0 results, show a message instead of the music note:

```jsx
{!error && results.length === 0 && !searching && query.trim().length >= 2 && (
  <div className="find-song-empty-state" style={{ opacity: 1 }}>
    <p className="find-song-no-results">No songs found</p>
  </div>
)}
```

Add CSS:
```css
.find-song-no-results {
  font-size: 14px;
  color: var(--foreground-muted, #71717a);
}
```

- [ ] **Step 4: Clear modal state when reopening**

The `handleClose` function already resets state. Verify that opening the modal again after closing starts fresh (no stale results or selection).

- [ ] **Step 5: Verify all states match Figma designs**

Check each modal state against the Figma mockups:
1. Empty state (no query): music note icon on left, "Preview" text on right ✓
2. Search results, no selection: results list on left, "Preview" on right ✓
3. Song selected: results list with selected item highlighted, mini document on right ✓
4. "Add song" button is disabled (50% opacity) until a song is selected ✓
5. Dark mode: verify colors work in dark theme

- [ ] **Step 6: Commit**

```bash
git add src/services/lrclib.js src/components/FindSongModal.jsx src/components/FindSongModal.css src/components/NewSongDropdown.jsx
git commit -m "feat: polish Find a Song modal — edge cases, keyboard nav, empty states"
```

---

## Implementation Notes

### HeroUI v3 API caveats
- **Always check component docs** via MCP before implementing. The v3 beta API is unstable.
- **Dropdown** may not exist or may have different compound component structure. Fallback: use Popover or a custom positioned div.
- **Modal** compound components: verify whether it's `Modal.Content`/`Modal.Header`/`Modal.Body`/`Modal.Footer` or a different pattern.
- **Button** uses `onPress` not `onClick`. `variant` prop for styling, no `color` prop in some variants.

### LRCLIB API details
- Base: `https://lrclib.net/api/search?q={query}`
- No auth, no API key, CORS-enabled for browser requests
- Returns up to 20 results by default
- Fields: `id`, `name`, `trackName`, `artistName`, `albumName`, `duration`, `instrumental`, `plainLyrics`, `syncedLyrics`
- Be polite: 400ms debounce on search; browsers strip custom `User-Agent`, so just use defaults
- Use AbortController to cancel stale requests when the user types faster than the debounce

### Document construction
- `buildDocumentFromLyrics` in `src/services/songDocument.js` builds the full TipTap doc JSON
- Blank-line collapsing logic mirrors `normalizePasteLines` from `src/editor/pasteUtils.js` — kept separate to avoid coupling the services layer to editor internals
- `lineId` attributes are NOT set in the JSON — the LyricLine extension assigns them automatically via `onCreate`
- The `songTitle` node requires `attrs: { level: 1 }` when providing content

### Song creation flow
- Direct Supabase INSERT from SongBrowser (not route state), then navigate to `/songs/{new-id}`
- This avoids modifying SongEditor per spec constraint
- The song is immediately persisted — no deferred creation needed
