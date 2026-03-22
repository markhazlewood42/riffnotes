import { Button, Dropdown } from "@heroui/react";
import { ChevronDown, Music, Search } from "lucide-react";
import "./NewSongDropdown.css";

function NewSongDropdown({ onNewBlank, onFindSong }) {
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button variant="primary">
          <Music size={16} />
          New
          <ChevronDown size={14} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          aria-label="New song options"
          className="new-song-dropdown-menu"
          onAction={(key) => {
            if (key === "blank") onNewBlank();
            if (key === "find") onFindSong();
          }}
        >
          <Dropdown.Item key="blank" id="blank" className="new-song-dropdown-item">
            <div className="new-song-dropdown-icon">
              <Music size={18} />
            </div>
            <div className="new-song-dropdown-text">
              <span className="new-song-dropdown-title">New blank song</span>
              <span className="new-song-dropdown-description">Start with an empty document</span>
            </div>
          </Dropdown.Item>
          <Dropdown.Item key="find" id="find" className="new-song-dropdown-item">
            <div className="new-song-dropdown-icon">
              <Search size={18} />
            </div>
            <div className="new-song-dropdown-text">
              <span className="new-song-dropdown-title">Find a song</span>
              <span className="new-song-dropdown-description">Search and import lyrics</span>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default NewSongDropdown;
