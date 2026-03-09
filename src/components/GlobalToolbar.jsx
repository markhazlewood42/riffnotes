import { Button, Chip } from "@heroui/react";
import { CoffeeIcon, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./GlobalToolbar.css";

function GlobalToolbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
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
      <span className="toolbar-app-name">GigNotes</span>
      <div className="toolbar-right">
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
          <>
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
            <Button
              size="sm"
              variant="tertiary"
              onPress={signOut}
              className="toolbar-signout-btn"
            >
              <span className="toolbar-btn-label">Sign out</span>
              <LogOut size={16} className="toolbar-signout-icon" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export default GlobalToolbar;
