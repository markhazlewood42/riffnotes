import {
  Button,
  Description,
  Label,
  ListBox,
  Modal,
  SearchField,
  Separator,
  Spinner,
  useOverlayState,
} from "@heroui/react";
import { FileText, Music } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLyrics, searchSongs } from "../services/lrclib";
import "./FindSongModal.css";

const DEBOUNCE_MS = 400;

function FindSongModal({ isOpen, onClose, onAddSong }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [lyricsNotFound, setLyricsNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const lyricsAbortRef = useRef(null);

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) handleClose();
    },
  });

  const handleSearch = useCallback((value) => {
    setQuery(value);
    setSelectedSong(null);
    setLyrics(null);
    setLyricsNotFound(false);
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
        const data = await searchSongs(value, {
          signal: abortRef.current.signal,
        });
        setResults(data);
        setSearchDone(true);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Song search failed:", err);
        setError(
          "Could not reach the song database. Check your connection and try again.",
        );
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSelectedSong(null);
    setLyrics(null);
    setLyricsNotFound(false);
    setError(null);
    setSearchDone(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (lyricsAbortRef.current) lyricsAbortRef.current.abort();
    onClose();
  };

  const handleAddSong = async () => {
    if (!selectedSong || !lyrics || adding) return;
    setAdding(true);
    await onAddSong({ ...selectedSong, plainLyrics: lyrics });
    setAdding(false);
    handleClose();
  };

  // Fetch lyrics when a song is selected
  useEffect(() => {
    if (!selectedSong) {
      setLyrics(null);
      setLyricsNotFound(false);
      return;
    }

    if (lyricsAbortRef.current) lyricsAbortRef.current.abort();
    lyricsAbortRef.current = new AbortController();

    setLoadingLyrics(true);
    setLyrics(null);
    setLyricsNotFound(false);

    getLyrics(selectedSong.trackName, selectedSong.artistName, {
      signal: lyricsAbortRef.current.signal,
    })
      .then((result) => {
        if (result) {
          setLyrics(result.plainLyrics);
        } else {
          setLyricsNotFound(true);
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Lyrics fetch failed:", err);
        setLyricsNotFound(true);
      })
      .finally(() => {
        setLoadingLyrics(false);
      });
  }, [selectedSong]);

  // Keyboard: Enter to add selected song (Escape handled by Modal)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && selectedSong && lyrics && !adding)
        handleAddSong();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedSong, lyrics, adding]);

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
      <Modal.Backdrop isDismissable>
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
                  <p className="find-song-search-hint">
                    Search for a song by title or artist
                  </p>
                </SearchField>

                <Separator />

                <div className="find-song-results-area">
                  {error && <p className="find-song-error">{error}</p>}
                  {!error &&
                    results.length === 0 &&
                    !searching &&
                    !searchDone && (
                      <div className="find-song-empty-state">
                        <Music size={40} />
                      </div>
                    )}
                  {!error &&
                    results.length === 0 &&
                    !searching &&
                    searchDone && (
                      <div className="find-song-empty-state find-song-empty-state--visible">
                        <p className="find-song-no-results">No songs found</p>
                      </div>
                    )}
                  {!error && searching && (
                    <div className="find-song-empty-state find-song-empty-state--visible">
                      <Spinner size="md" color="accent" />
                    </div>
                  )}
                  {!searching && results.length > 0 && (
                    <ListBox
                      aria-label="Search results"
                      selectionMode="single"
                      selectedKeys={
                        selectedSong ? [String(selectedSong.id)] : []
                      }
                      onSelectionChange={handleSelectionChange}
                      className="find-song-results-list"
                    >
                      {results.map((song) => (
                        <ListBox.Item
                          key={String(song.id)}
                          id={String(song.id)}
                          textValue={song.trackName}
                        >
                          <div className="find-song-result-item">
                            <Label>{song.trackName}</Label>
                            <Description>{song.artistName}</Description>
                          </div>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  )}
                </div>
              </div>
              <Separator orientation="vertical" />
              {/* Right pane */}
              <div className="find-song-right">
                {!selectedSong && (
                  <div className="find-song-preview-empty">
                    <FileText size={20} />
                    <p>Preview</p>
                  </div>
                )}
                {selectedSong && loadingLyrics && (
                  <div className="find-song-preview-empty">
                    <Spinner size="md" color="accent" />
                  </div>
                )}
                {selectedSong && lyricsNotFound && !loadingLyrics && (
                  <div className="find-song-preview-empty find-song-preview-empty--visible">
                    <p>Lyrics not available for this song</p>
                  </div>
                )}
                {selectedSong && lyrics && !loadingLyrics && (
                  <div className="find-song-preview">
                    <div className="find-song-preview-doc">
                      <h3 className="find-song-preview-title">
                        {selectedSong.artistName} - {selectedSong.trackName}
                      </h3>
                      <div className="find-song-preview-lyrics">{lyrics}</div>
                    </div>
                  </div>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="find-song-footer">
              <Button variant="secondary" onPress={handleClose} size="sm">
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleAddSong}
                size="sm"
                isDisabled={!selectedSong || !lyrics || adding}
              >
                {adding ? "Adding..." : "Add song"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default FindSongModal;
