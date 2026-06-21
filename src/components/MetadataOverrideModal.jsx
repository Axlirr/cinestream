import React, { useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { CloseIcon } from "./Icons";

export default function MetadataOverrideModal({
  item,
  mediaType,
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [posterUrl, setPosterUrl] = useState("");

  useEffect(() => {
    const overrides = storage.get(STORAGE_KEYS.METADATA_OVERRIDES) || {};
    const existing = overrides[item.id];
    if (existing) {
      setTitle(existing.title || "");
      setYear(existing.year || "");
      setPosterUrl(existing.poster || "");
    }
  }, [item.id]);

  const handleSave = () => {
    const overrides = storage.get(STORAGE_KEYS.METADATA_OVERRIDES) || {};
    
    // Clean inputs
    const t = title.trim();
    const y = year.trim();
    const p = posterUrl.trim();

    if (!t && !y && !p) {
      // Remove override if empty
      delete overrides[item.id];
    } else {
      overrides[item.id] = {
        title: t || undefined,
        year: y || undefined,
        poster: p || undefined,
      };
    }
    
    storage.set(STORAGE_KEYS.METADATA_OVERRIDES, overrides);
    onSave(overrides[item.id]);
    onClose();
  };

  const handleReset = () => {
    const overrides = storage.get(STORAGE_KEYS.METADATA_OVERRIDES) || {};
    delete overrides[item.id];
    storage.set(STORAGE_KEYS.METADATA_OVERRIDES, overrides);
    onSave(null);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(10px)",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: 460,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          position: "relative",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: "var(--text3)",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <CloseIcon size={20} />
        </button>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
          Edit Metadata
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>
          Override details for <strong style={{ color: "var(--text)" }}>{item.title || item.name}</strong>.
          Changes only apply locally on your device.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text2)" }}>Custom Title</div>
          <input
            type="text"
            className="input"
            placeholder={item.title || item.name}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text2)" }}>Custom Release Year</div>
          <input
            type="text"
            className="input"
            placeholder={item.release_date ? item.release_date.split("-")[0] : item.first_air_date ? item.first_air_date.split("-")[0] : "YYYY"}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text2)" }}>Custom Poster URL</div>
          <input
            type="text"
            className="input"
            placeholder="https://..."
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
          />
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
            Paste a direct URL to an image.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, color: "var(--red)" }}
            onClick={handleReset}
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
