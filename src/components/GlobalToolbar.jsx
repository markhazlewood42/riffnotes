import { Button, Chip } from "@heroui/react";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./GlobalToolbar.css";

function GlobalToolbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="global-toolbar">
      <Chip size="sm" color="danger" className="toolbar-alpha-chip">
        <Chip.Label className="font-semibold">ALPHA PREVIEW</Chip.Label>
      </Chip>
      <span className="toolbar-app-name">GigNotes</span>
      <div className="global-toolbar-right">
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Toggle theme"
          onPress={toggleTheme}
          className="theme-toggle"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
