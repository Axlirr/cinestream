import { useState } from "react";
import { BookmarkIcon, BookmarkFillIcon } from "./Icons";

export default function PlaylistModal({
  item,
  folders,
  saved,
  onClose,
  onToggleItem,
  onCreateFolder,
}) {
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const itemId = `${item.media_type === "tv" ? "tv" : "movie"}_${item.id}`;

  const handleCreate = (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px" }}>Save to...</h2>
          <div style={{ fontSize: 14, color: "var(--text2)" }}>
            {item.title || item.name}
          </div>
        </div>

        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {folders.map((f) => {
            const inFolder = saved[itemId]?.folderIds?.includes(f.id) || (f.id === "default" && !!saved[itemId]);
            return (
              <label
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--surface2)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={inFolder}
                  onChange={() => onToggleItem(item, f.id)}
                  style={{ width: 18, height: 18, accentColor: "var(--red)" }}
                />
                <span style={{ flex: 1, fontWeight: 500 }}>{f.name}</span>
              </label>
            );
          })}
        </div>

        {isCreating ? (
          <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="text-input"
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setIsCreating(true)}
          >
            + New Folder
          </button>
        )}

        <div style={{ marginTop: 24, textAlign: "right" }}>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
