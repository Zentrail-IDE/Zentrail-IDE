import { Boxes, Search, PanelLeft } from "lucide-react";
import { useUi } from "../state/uiStore";

/** Top application menu bar: brand, menus, and global action buttons. */
export function MenuBar() {
  const setCommandOpen = useUi((s) => s.setCommandOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);

  return (
    <header className="menubar">
      <div className="menubar__brand">
        <Boxes size={16} className="accent" />
        <span>Zentrail IDE</span>
      </div>

      <nav className="menubar__menu" aria-label="Application menu">
        <button className="menubar__item" type="button">File</button>
        <button className="menubar__item" type="button">Edit</button>
        <button className="menubar__item" type="button">View</button>
        <button className="menubar__item" type="button">Help</button>
      </nav>

      <div className="menubar__actions">
        <button
          className="iconbtn"
          type="button"
          title="Search files (Ctrl/Cmd+P)"
          onClick={() => setCommandOpen(true)}
        >
          <Search size={15} />
        </button>
        <button
          className="iconbtn"
          type="button"
          title="Toggle sidebar"
          onClick={toggleSidebar}
        >
          <PanelLeft size={15} />
        </button>
      </div>
    </header>
  );
}
