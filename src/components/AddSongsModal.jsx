import {
  Button,
  Label,
  ListBox,
  Modal,
  SearchField,
  Separator,
  useOverlayState,
} from "@heroui/react";
import { Check, Music } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./AddSongsModal.css";

function AddSongsModal({
  isOpen,
  onClose,
  allSongs,
  currentSongIds,
  onSave,
}) {
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) handleClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(new Set(currentSongIds || []));
      setQuery("");
      setSaving(false);
      setError(null);
    }
  }, [isOpen, currentSongIds]);

  const filteredSongs = useMemo(() => {
    if (!query.trim()) return allSongs;
    const q = query.toLowerCase();
    return allSongs.filter(
      (s) => (s.title || "Untitled").toLowerCase().includes(q)
    );
  }, [allSongs, query]);

  const handleClose = () => {
    setQuery("");
    setError(null);
    onClose();
  };

  // Normalize "all" to concrete set of IDs
  const resolvedKeys = selectedKeys === "all"
    ? new Set(allSongs.map((s) => s.id))
    : selectedKeys;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave([...resolvedKeys]);
      handleClose();
    } catch (err) {
      console.error("Add songs failed:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const addedCount = [...resolvedKeys].filter(
    (id) => !currentSongIds?.includes(id)
  ).length;
  const removedCount = (currentSongIds || []).filter(
    (id) => !resolvedKeys.has(id)
  ).length;

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg" className="add-songs-container">
          <Modal.Dialog className="add-songs-dialog">
            <Modal.CloseTrigger className="add-songs-close" />

            <Modal.Body className="add-songs-body">
              <h3 className="add-songs-title">Add Songs to Set List</h3>
              <SearchField
                value={query}
                onChange={setQuery}
                aria-label="Filter songs"
                className="add-songs-search"
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Filter by title..." />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <Separator />

              <div className="add-songs-list-area">
                {filteredSongs.length === 0 ? (
                  <div className="add-songs-empty">
                    <Music size={32} />
                    <p>{query ? "No matching songs" : "No songs in library"}</p>
                  </div>
                ) : (
                  <ListBox
                    aria-label="Songs"
                    selectionMode="multiple"
                    selectedKeys={selectedKeys}
                    onSelectionChange={setSelectedKeys}
                    className="add-songs-listbox"
                  >
                    {filteredSongs.map((song) => {
                      const isSelected = selectedKeys === "all" || selectedKeys.has(song.id);
                      return (
                        <ListBox.Item
                          key={song.id}
                          id={song.id}
                          textValue={song.title || "Untitled"}
                          className="add-songs-item"
                        >
                          <span className={`add-songs-checkbox ${isSelected ? "add-songs-checkbox--checked" : ""}`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </span>
                          <Label>{song.title || "Untitled"}</Label>
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                )}
              </div>

              {error && <p className="add-songs-error">{error}</p>}
            </Modal.Body>

            <Modal.Footer className="add-songs-footer">
              <span className="add-songs-count">
                {resolvedKeys.size} selected
                {addedCount > 0 && `, ${addedCount} to add`}
                {removedCount > 0 && `, ${removedCount} to remove`}
              </span>
              <Button variant="secondary" onPress={handleClose} size="sm">
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                size="sm"
                isDisabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default AddSongsModal;
