import { Button, Dropdown, Separator } from "@heroui/react";
import { ChevronDown, ListMusic, Plus } from "lucide-react";
import "./SetlistSelector.css";

function SetlistSelector({
  setlists,
  activeSetlistId,
  onSelectSetlist,
  onNewSetlist,
}) {
  const activeSetlist = setlists.find((s) => s.id === activeSetlistId);
  const label = activeSetlist ? activeSetlist.name : "All Songs";

  return (
    <Dropdown>
      <Dropdown.Trigger>
        <button className="setlist-selector-trigger" type="button">
          <span className="setlist-selector-label">{label}</span>
          <ChevronDown size={16} className="setlist-selector-chevron" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start" className="setlist-selector-popover">
        <Dropdown.Menu
          aria-label="Set list selector"
          className="setlist-selector-menu"
          onAction={(key) => {
            if (key === "all") onSelectSetlist(null);
            else if (key === "new") onNewSetlist();
            else onSelectSetlist(key);
          }}
        >
          <Dropdown.Item key="all" id="all" className="setlist-selector-item">
            <ListMusic size={16} />
            <span>All Songs</span>
          </Dropdown.Item>

          <Dropdown.Separator />

          {setlists.map((sl) => (
            <Dropdown.Item
              key={sl.id}
              id={sl.id}
              className="setlist-selector-item"
            >
              <ListMusic size={16} />
              <span>{sl.name}</span>
            </Dropdown.Item>
          ))}

          {setlists.length > 0 && <Dropdown.Separator />}

          <Dropdown.Item key="new" id="new" className="setlist-selector-item setlist-selector-item--action">
            <Plus size={16} />
            <span>New Set List...</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default SetlistSelector;
