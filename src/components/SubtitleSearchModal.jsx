import React, { useState, useEffect } from "react";
import { secureStorage } from "../utils/storage";
import { CloseIcon, SearchIcon, DownloadIcon } from "./Icons";

// Very basic SRT to VTT converter
function srtToVtt(srt) {
  if (srt.trim().startsWith("WEBVTT")) return srt;
  let vtt = "WEBVTT\n\n";
  let lines = srt.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Replace comma with dot in timestamps
    if (line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/)) {
      line = line.replace(/,/g, ".");
    }
    vtt += line + "\n";
  }
  return vtt;
}

export default function SubtitleSearchModal({ item, season, episode, onClose, onInjectSubtitle }) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [injectingFileId, setInjectingFileId] = useState(null);

  useEffect(() => {
    async function search() {
      try {
        setLoading(true);
        setError(null);
        const subdlApiKey = await secureStorage.get("subdlApiKey");
        const wyzieApiKey = await secureStorage.get("wyzieApiKey");
        
        const res = await window.electron.searchSubtitles({
          tmdbId: item.id,
          mediaType: item.media_type,
          season,
          episode,
          subdlApiKey,
          wyzieApiKey,
        });

        if (!res.ok) {
          setError(res.error);
        } else {
          setResults(res.results || []);
        }
      } catch (err) {
        setError(err.message || "Failed to search subtitles");
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [item.id, item.media_type, season, episode]);

  const handleSelect = async (sub) => {
    try {
      setInjectingFileId(sub.file_id);
      const res = await window.electron.getSubtitleText({ fileId: sub.file_id });
      if (!res.ok) {
        alert("Failed to load subtitle: " + res.error);
        return;
      }
      
      const vttData = srtToVtt(res.text);
      onInjectSubtitle(vttData, sub.language || "unknown");
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setInjectingFileId(null);
    }
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
          width: 500,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          position: "relative",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 24, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
              Subtitles
            </div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
              {item.title || item.name} {season ? `S${season} E${episode}` : ""}
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4 }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40, color: "var(--text2)" }}>
              <div className="spinner" />
              <span>Searching subtitles...</span>
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: 20, background: "rgba(255, 60, 60, 0.1)", color: "var(--red)", borderRadius: 8, fontSize: 14 }}>
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
              No subtitles found for this media.
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((sub, i) => (
                <div
                  key={sub.file_id || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 12,
                    background: "var(--surface2)",
                    borderRadius: 8,
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "var(--primary-glow)",
                      color: "var(--primary)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {(sub.language || "??").substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sub.release}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                      By {sub.uploader} · {sub.via_subdl ? "SubDL" : "Wyzie"}
                      {sub.hearing_impaired && <span style={{ marginLeft: 6, color: "var(--text2)" }}>[HI]</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "6px 12px", fontSize: 13, minWidth: 80 }}
                    onClick={() => handleSelect(sub)}
                    disabled={injectingFileId === sub.file_id}
                  >
                    {injectingFileId === sub.file_id ? (
                      <div className="spinner" style={{ width: 14, height: 14, borderLeftColor: "#fff" }} />
                    ) : (
                      "Inject"
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
