import { Button, Modal, useOverlayState } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import "./SetlistModal.css";

function SetlistModal({ isOpen, onClose, onSave, initialName, mode }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      setName(initialName || "");
      setSaving(false);
      setError(null);
    }
  }, [isOpen, initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      console.error("Setlist save failed:", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
  };

  const title = mode === "rename" ? "Rename Set List" : "New Set List";

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm" className="setlist-modal-container">
          <Modal.Dialog className="setlist-modal-dialog">
            <Modal.Body className="setlist-modal-body">
              <h3 className="setlist-modal-title">{title}</h3>
              <div className="setlist-modal-field">
                <label className="setlist-modal-label" htmlFor="setlist-name">Name</label>
                <input
                  id="setlist-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Friday Gig"
                  className="setlist-modal-input"
                />
              </div>
              {error && <p className="setlist-modal-error">{error}</p>}
            </Modal.Body>
            <Modal.Footer className="setlist-modal-footer">
              <Button variant="secondary" onPress={onClose} size="sm">
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSave}
                size="sm"
                isDisabled={!name.trim() || saving}
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

export default SetlistModal;
