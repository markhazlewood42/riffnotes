import { Button, ListBox, Modal, SearchField, Separator, useOverlayState } from '@heroui/react';
import { FileText, Music } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { searchSongs } from '../services/lrclib';
import './FindSongModal.css';

const DEBOUNCE_MS = 400;

function FindSongModal({ isOpen, onClose, onAddSong }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) handleClose();
    },
  });

  const handleSearch = useCallback((value) => {
    setQuery(value);
    setSelectedSong(null);
    setError(null);
    setSearchDone(false);

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
        setSearchDone(true);
      } catch (err) {
        if (err.name === 'AbortError') return;
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
    setSearchDone(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    onClose();
  };

  const handleAddSong = async () => {
    if (!selectedSong || adding) return;
    setAdding(true);
    await onAddSong(selectedSong);
    setAdding(false);
    handleClose();
  };

  // Keyboard: Enter to add selected song (Escape handled by Modal)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && selectedSong && !adding) handleAddSong();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedSong, adding]);

  const handleSelectionChange = (keys) => {
    const selectedId = [...keys][0];
    if (selectedId != null) {
      const song = results.find((s) => String(s.id) === String(selectedId));
      setSelectedSong(song || null);
    } else {
      setSelectedSong(null);
    }
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable />
      <Modal.Container size="4xl" className="find-song-container">
        <Modal.Dialog className="find-song-dialog">
          <Modal.CloseTrigger className="find-song-close" />

          <Modal.Body className="find-song-body">
            {/* Left pane */}
            <div className="find-song-left">
              <SearchField
                value={query}
                onChange={handleSearch}
                aria-label="Find a song"
                autoFocus
                className="find-song-search-field"
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Find a song ..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
                <p className="find-song-search-hint">Search for a song by title or artist</p>
              </SearchField>

              <Separator />

              <div className="find-song-results-area">
                {error && <p className="find-song-error">{error}</p>}
                {!error && results.length === 0 && !searching && !searchDone && (
                  <div className="find-song-empty-state">
                    <Music size={40} />
                  </div>
                )}
                {!error && results.length === 0 && !searching && searchDone && (
                  <div className="find-song-empty-state find-song-empty-state--visible">
                    <p className="find-song-no-results">No songs found</p>
                  </div>
                )}
                {!error && searching && results.length === 0 && (
                  <div className="find-song-empty-state find-song-empty-state--visible">
                    <p className="find-song-searching-text">Searching...</p>
                  </div>
                )}
                {results.length > 0 && (
                  <ListBox
                    aria-label="Search results"
                    selectionMode="single"
                    selectedKeys={selectedSong ? [String(selectedSong.id)] : []}
                    onSelectionChange={handleSelectionChange}
                    className="find-song-results-list"
                  >
                    {results.map((song) => (
                      <ListBox.Item key={String(song.id)} id={String(song.id)} textValue={song.trackName}>
                        <span className="find-song-result-title">{song.trackName}</span>
                        <span className="find-song-result-artist">{song.artistName}</span>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                )}
              </div>
            </div>

            <Separator orientation="vertical" />

            {/* Right pane */}
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
          </Modal.Body>

          <Modal.Footer className="find-song-footer">
            <Button variant="secondary" onPress={handleClose} size="sm">Cancel</Button>
            <Button variant="primary" onPress={handleAddSong} size="sm" isDisabled={!selectedSong || adding}>
              {adding ? 'Adding...' : 'Add song'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal>
  );
}

export default FindSongModal;
