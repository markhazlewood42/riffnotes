import { Chip } from "@heroui/chip";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./GlobalToolbar.css";

function GlobalToolbar({ children }) {
  const { user, signOut } = useAuth();
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
        <Chip
          size="sm"
          color="danger"
          classNames={{ content: "font-semibold" }}
        >
          ALPHA PREVIEW
        </Chip>
      </div>
      <div className="global-toolbar-center">{children}</div>
      <div className="global-toolbar-right">
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
            <button
              className="toolbar-btn toolbar-btn-signout"
              onClick={signOut}
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default GlobalToolbar;
