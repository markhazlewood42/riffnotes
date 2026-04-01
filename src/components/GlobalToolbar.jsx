import { Button, Chip, Dropdown, Separator } from "@heroui/react";
import { ChevronDown, CoffeeIcon, Lightbulb, LogOut, Moon, Shield, Sun } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { TOUR_DONE_KEY } from "./OnboardingTour";
import WelcomeModal, { WELCOMED_KEY } from "./WelcomeModal";
import "./GlobalToolbar.css";

function GlobalToolbar() {
  const { user, signOut, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeExampleId, setWelcomeExampleId] = useState(null);

  const handleMenuAction = (key) => {
    if (key === "walkthrough") {
      localStorage.removeItem(WELCOMED_KEY);
      localStorage.removeItem(TOUR_DONE_KEY);
      const exampleId = localStorage.getItem("riffnotes_example_song_id");
      setWelcomeExampleId(exampleId);
      setWelcomeOpen(true);
    } else if (key === "signout") {
      signOut();
    }
  };

  return (
    <>
      <header className="global-toolbar">
        <div className="toolbar-left">
          <Chip size="md" color="danger" variant="primary">
            <Chip.Label className="font-semibold">
              <span className="toolbar-chip-full">ALPHA PREVIEW</span>
              <span className="toolbar-chip-short">ALPHA</span>
            </Chip.Label>
          </Chip>
          <a
            href="https://buymeacoffee.com/markhazlewood"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="secondary" className="toolbar-coffee-btn">
              <CoffeeIcon size={16} />
              <span className="toolbar-btn-label toolbar-coffee-label">Buy me a coffee</span>
            </Button>
          </a>
        </div>
        <Link to="/" className="toolbar-app-name">RiffNotes</Link>
        <div className="toolbar-right">
          {isAdmin && (
            <Link
              to="/admin"
              className="toolbar-admin-link"
              title="Admin"
              aria-label="Admin"
            >
              <Shield size={16} />
            </Link>
          )}
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="Toggle theme"
            onPress={toggleTheme}
            className="theme-toggle"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          {user && (
            <Dropdown>
              <Dropdown.Trigger className="toolbar-user-trigger" aria-label="Account menu">
                {user.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    className="toolbar-avatar"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="toolbar-user-name">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <ChevronDown size={13} className="toolbar-user-chevron" />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end" className="toolbar-user-popover">
                <Dropdown.Menu
                  aria-label="Account options"
                  onAction={handleMenuAction}
                >
                  <Dropdown.Item id="walkthrough" textValue="RiffNotes walkthrough">
                    <Lightbulb size={15} className="toolbar-menu-icon" />
                    RiffNotes walkthrough
                  </Dropdown.Item>
                  <Separator />
                  <Dropdown.Item id="signout" textValue="Sign out" variant="danger">
                    <LogOut size={15} className="toolbar-menu-icon" />
                    Sign out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </header>
      {welcomeOpen && (
        <WelcomeModal
          isOpen={welcomeOpen}
          onClose={() => setWelcomeOpen(false)}
          exampleSongId={welcomeExampleId}
        />
      )}
    </>
  );
}

export default GlobalToolbar;
