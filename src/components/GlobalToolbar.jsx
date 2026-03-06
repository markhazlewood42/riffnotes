import { Button, Chip } from "@heroui/react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./GlobalToolbar.css";

function GlobalToolbar({ children }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isEditing = location.pathname.startsWith("/songs/");

  return (
    <header className="global-toolbar">
      <div className="global-toolbar-left">
        {isEditing ? (
          <Link to="/" className="toolbar-back-link">
            &larr; Songs
          </Link>
        ) : (
          <span className="toolbar-app-name">GigNotes</span>
        )}
        <Chip size="sm" color="danger">
          <Chip.Label className="font-semibold">ALPHA PREVIEW</Chip.Label>
        </Chip>
      </div>
      <div className="global-toolbar-center">{children}</div>
      <div className="global-toolbar-right">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Toggle theme"
          onPress={toggleTheme}
          className="theme-toggle"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
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
            >
              Sign out
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export default GlobalToolbar;
