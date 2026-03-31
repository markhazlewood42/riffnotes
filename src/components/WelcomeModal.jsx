import { Button, Modal, useOverlayState } from "@heroui/react";
import { Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./WelcomeModal.css";

const WELCOMED_KEY = "riffnotes_welcomed";

export function hasBeenWelcomed() {
  return localStorage.getItem(WELCOMED_KEY) === "true";
}

function WelcomeModal({ isOpen, onClose, exampleSongId }) {
  const navigate = useNavigate();

  const state = useOverlayState({
    isOpen,
    onOpenChange: (open) => {
      if (!open) handleDismiss();
    },
  });

  const handleDismiss = () => {
    localStorage.setItem(WELCOMED_KEY, "true");
    onClose();
  };

  const handleOpenSong = () => {
    localStorage.setItem(WELCOMED_KEY, "true");
    onClose();
    if (exampleSongId) navigate(`/songs/${exampleSongId}`);
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="sm">
          <Modal.Dialog className="welcome-modal-dialog">
            <Modal.CloseTrigger />
            <Modal.Header className="welcome-modal-header">
              <div className="welcome-modal-icon">
                <Music size={22} />
              </div>
              <h2 className="welcome-modal-title">Welcome to RiffNotes</h2>
              <p className="welcome-modal-subtitle">
                Your practice song is ready — open it to try annotating lyrics with chords and notes.
              </p>
            </Modal.Header>
            <Modal.Footer className="welcome-modal-footer">
              <Button variant="secondary" size="sm" onPress={handleDismiss}>
                Maybe later
              </Button>
              <Button variant="primary" size="sm" onPress={handleOpenSong}>
                Open practice song
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default WelcomeModal;
