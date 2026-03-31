import { Button, Card, Spinner } from "@heroui/react";
import {
  GripVertical,
  ListMusic,
  LockIcon,
  Music,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AddSongsModal from "../components/AddSongsModal";
import FindSongModal from "../components/FindSongModal";
import GlobalToolbar from "../components/GlobalToolbar";
import NewSongDropdown from "../components/NewSongDropdown";
import SetlistModal from "../components/SetlistModal";
import SetlistSelector from "../components/SetlistSelector";
import WelcomeModal, { hasBeenWelcomed } from "../components/WelcomeModal";
import { useAuth } from "../context/AuthContext";
import {
  addSongsToSetlist,
  createSetlist,
  deleteSetlist,
  fetchSetlistSongs,
  fetchSetlists,
  removeSongFromSetlist,
  renameSetlist,
  reorderSetlistSongs,
} from "../services/setlists";
import { buildDocumentFromLyrics } from "../services/songDocument";
import { supabase } from "../supabase";
import { deleteAnnotationImages } from "../utils/deleteAnnotationImage";
import "./SongBrowser.css";

function SongBrowser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [findModalOpen, setFindModalOpen] = useState(false);

  // Setlist state
  const [setlists, setSetlists] = useState([]);
  const [activeSetlistId, setActiveSetlistId] = useState(null);
  const [setlistSongs, setSetlistSongs] = useState([]);
  const [setlistLoading, setSetlistLoading] = useState(false);
  const [setlistModalOpen, setSetlistModalOpen] = useState(false);
  const [setlistModalMode, setSetlistModalMode] = useState("create");
  const [addSongsModalOpen, setAddSongsModalOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  // Drag state
  const dragItemRef = useRef(null);
  const dragOverRef = useRef(null);

  // Load songs + setlists on mount
  useEffect(() => {
    Promise.all([
      supabase
        .from("songs")
        .select("id, title, updated_at, created_at, is_locked, is_example")
        .eq("user_id", user.id)
        .order("is_example", { ascending: false })
        .order("updated_at", { ascending: false }),
      fetchSetlists(user.id),
    ])
      .then(([songsResult, setlistsData]) => {
        if (songsResult.error) console.error("Failed to load songs:", songsResult.error);
        const loadedSongs = songsResult.data || [];
        setSongs(loadedSongs);
        setSetlists(setlistsData || []);
        if (!hasBeenWelcomed() && loadedSongs.some((s) => s.is_example)) {
          setWelcomeOpen(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load initial data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Load setlist songs when active setlist changes
  useEffect(() => {
    if (!activeSetlistId) {
      setSetlistSongs([]);
      return;
    }
    setSetlistLoading(true);
    fetchSetlistSongs(activeSetlistId)
      .then((data) => setSetlistSongs(data))
      .catch((err) => console.error("Failed to load setlist songs:", err))
      .finally(() => setSetlistLoading(false));
  }, [activeSetlistId]);

  const activeSetlist = setlists.find((s) => s.id === activeSetlistId);

  const createSong = () => navigate("/songs/new");

  const deleteSong = async (e, songId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this song?")) return;

    const { data: song, error: fetchError } = await supabase
      .from("songs")
      .select("annotations")
      .eq("id", songId)
      .single();
    if (fetchError) {
      console.error("Failed to fetch annotations for cleanup:", fetchError);
    } else if (song?.annotations) {
      await deleteAnnotationImages(song.annotations);
    }

    const { error } = await supabase.from("songs").delete().eq("id", songId);
    if (error) {
      console.error("Failed to delete song:", error);
      return;
    }
    setSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Setlist CRUD
  const handleCreateSetlist = async (name) => {
    const newSetlist = await createSetlist(user.id, name);
    setSetlists((prev) => [...prev, newSetlist].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveSetlistId(newSetlist.id);
  };

  const handleRenameSetlist = async (name) => {
    await renameSetlist(activeSetlistId, name);
    setSetlists((prev) =>
      prev
        .map((s) => (s.id === activeSetlistId ? { ...s, name } : s))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleDeleteSetlist = async () => {
    if (!window.confirm(`Delete "${activeSetlist.name}"? Songs won't be deleted.`)) return;
    await deleteSetlist(activeSetlistId);
    setSetlists((prev) => prev.filter((s) => s.id !== activeSetlistId));
    setActiveSetlistId(null);
  };

  const handleAddSongs = async (selectedIds) => {
    const currentIds = setlistSongs.map((s) => s.id);
    const toAdd = selectedIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !selectedIds.includes(id));

    if (toAdd.length > 0) {
      await addSongsToSetlist(activeSetlistId, toAdd);
    }
    for (const id of toRemove) {
      await removeSongFromSetlist(activeSetlistId, id);
    }

    // Refresh
    const updated = await fetchSetlistSongs(activeSetlistId);
    setSetlistSongs(updated);
  };

  const handleRemoveFromSetlist = async (e, songId) => {
    e.stopPropagation();
    await removeSongFromSetlist(activeSetlistId, songId);
    setSetlistSongs((prev) => prev.filter((s) => s.id !== songId));
  };

  // Drag-and-drop reorder
  const handleDragStart = useCallback((e, index) => {
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    dragOverRef.current = index;
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const from = dragItemRef.current;
      const to = dragOverRef.current;
      if (from === null || to === null || from === to) return;

      const reordered = [...setlistSongs];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      setSetlistSongs(reordered);

      reorderSetlistSongs(
        activeSetlistId,
        reordered.map((s) => s.id)
      ).catch((err) => console.error("Reorder failed:", err));

      dragItemRef.current = null;
      dragOverRef.current = null;
    },
    [setlistSongs, activeSetlistId]
  );

  const isSetlistView = activeSetlistId !== null;
  const displaySongs = isSetlistView ? setlistSongs : songs;
  const isContentLoading = loading || (isSetlistView && setlistLoading);

  return (
    <div className="song-browser-page">
      <GlobalToolbar />
      <main className="song-browser-content">
        <div className="song-browser-header">
          <div className="song-browser-header-left">
            <SetlistSelector
              setlists={setlists}
              activeSetlistId={activeSetlistId}
              onSelectSetlist={setActiveSetlistId}
              onNewSetlist={() => {
                setSetlistModalMode("create");
                setSetlistModalOpen(true);
              }}
            />
            {isSetlistView && (
              <div className="setlist-header-actions">
                <button
                  className="setlist-header-btn"
                  onClick={() => {
                    setSetlistModalMode("rename");
                    setSetlistModalOpen(true);
                  }}
                  aria-label="Rename set list"
                  title="Rename set list"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="setlist-header-btn setlist-header-btn--danger"
                  onClick={handleDeleteSetlist}
                  aria-label="Delete set list"
                  title="Delete set list"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="song-browser-header-right">
            {isSetlistView && (
              <Button
                variant="secondary"
                size="sm"
                onPress={() => setAddSongsModalOpen(true)}
              >
                <Plus size={14} />
                Add Songs
              </Button>
            )}
            <NewSongDropdown
              onNewBlank={createSong}
              onFindSong={() => setFindModalOpen(true)}
            />
          </div>
        </div>

        {isContentLoading ? (
          <div className="song-browser-status">
            <Spinner size="lg" color="accent" />
          </div>
        ) : displaySongs.length === 0 ? (
          <div className="song-browser-empty">
            {isSetlistView ? (
              <>
                <ListMusic size={32} className="song-browser-empty-icon" />
                <p>No songs in this set list</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => setAddSongsModalOpen(true)}
                >
                  <Plus size={14} />
                  Add Songs
                </Button>
              </>
            ) : (
              <>
                <Music size={32} className="song-browser-empty-icon" />
                <p>No songs yet.</p>
              </>
            )}
          </div>
        ) : isSetlistView ? (
          /* Setlist: ordered vertical list */
          <div className="setlist-list">
            {displaySongs.map((song, index) => (
              <div
                key={song.id}
                className="setlist-item"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onClick={() => navigate(`/songs/${song.id}`)}
              >
                <span className="setlist-item-handle" title="Drag to reorder">
                  <GripVertical size={16} />
                </span>
                <span className="setlist-item-position">{index + 1}</span>
                <span className="setlist-item-title">
                  {song.title || "Untitled"}
                </span>
                <span className="setlist-item-date">
                  {formatDate(song.updated_at || song.created_at)}
                </span>
                <button
                  className="setlist-item-remove"
                  onClick={(e) => handleRemoveFromSetlist(e, song.id)}
                  aria-label={`Remove ${song.title || "Untitled"} from set list`}
                  title="Remove from set list"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* All Songs: grid */
          <div className="song-grid">
            {displaySongs.map((song) => (
              <Card
                key={song.id}
                className="song-card cursor-pointer"
                onClick={() => navigate(`/songs/${song.id}`)}
              >
                <Card.Content className="song-card-body">
                  <h3 className="song-card-title">
                    {song.title || "Untitled"}
                  </h3>
                  <p className="song-card-date">
                    {formatDate(song.updated_at || song.created_at)}
                  </p>
                  {song.is_example ? (
                    <span
                      className="song-card-locked"
                      title="Practice song — can't be deleted"
                    >
                      <LockIcon size={14} />
                    </span>
                  ) : (
                    <button
                      className="song-card-delete"
                      onClick={(e) => deleteSong(e, song.id)}
                      title="Delete song"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </main>

      <FindSongModal
        isOpen={findModalOpen}
        onClose={() => setFindModalOpen(false)}
        onAddSong={async (song) => {
          const title = `${song.artistName} - ${song.trackName}`;
          const document = buildDocumentFromLyrics(title, song.plainLyrics);

          const { data, error } = await supabase
            .from("songs")
            .insert({
              user_id: user.id,
              title,
              document,
              annotations: {},
            })
            .select("id")
            .single();

          if (error) {
            console.error("Failed to create song:", error);
            return;
          }

          navigate(`/songs/${data.id}`);
        }}
      />

      <SetlistModal
        isOpen={setlistModalOpen}
        onClose={() => setSetlistModalOpen(false)}
        onSave={setlistModalMode === "rename" ? handleRenameSetlist : handleCreateSetlist}
        initialName={setlistModalMode === "rename" ? activeSetlist?.name : ""}
        mode={setlistModalMode}
      />

      <AddSongsModal
        isOpen={addSongsModalOpen}
        onClose={() => setAddSongsModalOpen(false)}
        allSongs={songs.filter((s) => !s.is_example)}
        currentSongIds={setlistSongs.map((s) => s.id)}
        onSave={handleAddSongs}
      />

      <WelcomeModal
        isOpen={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        exampleSongId={songs.find((s) => s.is_example)?.id}
      />
    </div>
  );
}

export default SongBrowser;
