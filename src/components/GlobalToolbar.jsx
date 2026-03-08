import { Button, Chip } from "@heroui/react";
import { CoffeeIcon, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./GlobalToolbar.css";

function GlobalToolbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="global-toolbar">
      <div className="toolbar-alpha-chip">
        <Chip size="md" color="danger" variant="primary">
          <Chip.Label className="font-semibold">ALPHA PREVIEW</Chip.Label>
        </Chip>
        <a
          href="https://buymeacoffee.com/markhazlewood"
          target="_blank"
          className="ml-4"
        >
          <Button size="sm" variant="secondary">
            <CoffeeIcon />
            Buy me a coffee
          </Button>
        </a>
      </div>
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
            <Button size="sm" variant="tertiary" onPress={signOut}>
              Sign out
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export default GlobalToolbar;
