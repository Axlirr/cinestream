import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Hls from "hls.js";
import {
  SearchIcon,
  CloseIcon,
  PlayIcon,
  TVIcon,
  FilmIcon,
} from "../components/Icons";

// ── HLS player ────────────────────────────────────────────────────────────────
// Plays a live .m3u8 stream via hls.js, falling back to native HLS (Safari/
// some Chromium builds) when MSE-based hls.js isn't supported.
function LivePlayer({ channel, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel?.url) return;

    setError(null);
    setLoading(true);

    let destroyed = false;

    const onPlaying = () => {
      if (!destroyed) setLoading(false);
    };
    video.addEventListener("playing", onPlaying);

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 15000,
        // Inject per-channel User-Agent when the playlist specified one.
        xhrSetup: (xhr) => {
          if (channel.userAgent) {
            try {
              xhr.setRequestHeader("User-Agent", channel.userAgent);
            } catch {}
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return;
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (destroyed) return;
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover transient network stalls before giving up.
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError("This channel could not be played.");
              setLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (no custom headers possible here).
      video.src = channel.url;
      video.play().catch(() => {});
    } else {
      setError("HLS playback is not supported in this environment.");
      setLoading(false);
    }

    return () => {
      destroyed = true;
      video.removeEventListener("playing", onPlaying);
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
      try {
        video.removeAttribute("src");
        video.load();
      } catch {}
    };
  }, [channel]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            style={{ width: 32, height: 32, objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <TVIcon />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              color: "var(--text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {channel.name}
          </div>
          {channel.group && (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {channel.group}
            </div>
          )}
        </div>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          title="Close (Esc)"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <CloseIcon size={18} /> Close
        </button>
      </div>

      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading && !error && (
          <div
            className="spinner"
            style={{ position: "absolute", zIndex: 2 }}
          />
        )}
        {error && (
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              textAlign: "center",
              color: "var(--text2)",
              padding: 24,
            }}
          >
            <div style={{ marginBottom: 8 }}>{error}</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              Live IPTV streams are often unstable. Try another channel.
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", background: "#000" }}
        />
      </div>
    </div>
  );
}

// ── Channel card ───────────────────────────────────────────────────────────────
function ChannelCard({ channel, status, onPlay }) {
  return (
    <button
      className="livetv-card"
      onClick={() => onPlay(channel)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: 12,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "center",
        minHeight: 120,
      }}
    >
      <StatusBadge status={status} />
      <div
        style={{
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          style={{
            display: channel.logo ? "none" : "flex",
            color: "var(--text3)",
          }}
        >
          <TVIcon />
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)",
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
        title={channel.name}
      >
        {channel.name}
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const map = {
    live: { label: "LIVE", color: "#16a34a" },
    dead: { label: "OFF", color: "#dc2626" },
    checking: { label: "···", color: "var(--text3)" },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: 6,
        right: 6,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.5,
        padding: "2px 6px",
        borderRadius: 6,
        background: s.color,
        color: "#fff",
      }}
    >
      {s.label}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 60;

export default function LiveTVPage() {
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState({}); // id → "live"|"dead"|"checking"
  const [playing, setPlaying] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hasIpc = !!window.electron?.livetvLoad;

  // Load the list of available playlists once.
  useEffect(() => {
    if (!window.electron?.livetvGetPlaylists) return;
    window.electron.livetvGetPlaylists().then((pls) => {
      setPlaylists(pls || []);
      if (pls && pls.length) setActivePlaylist(pls[0]);
    });
  }, []);

  // Load channels whenever the active playlist changes.
  const loadPlaylist = useCallback(async (playlist) => {
    if (!playlist || !window.electron?.livetvLoad) return;
    setLoading(true);
    setError(null);
    setChannels([]);
    setStatuses({});
    setActiveGroup("All");
    setQuery("");
    setVisibleCount(PAGE_SIZE);
    try {
      const res = await window.electron.livetvLoad({ url: playlist.url, id: playlist.id });
      if (res.ok) {
        setChannels(res.channels || []);
        setGroups(res.groups || []);
      } else {
        setError(res.error || "Failed to load playlist");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePlaylist) loadPlaylist(activePlaylist);
  }, [activePlaylist, loadPlaylist]);

  // Esc closes the player.
  useEffect(() => {
    if (!playing) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPlaying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  // Derived filtered list.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      if (activeGroup !== "All" && c.group !== activeGroup) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [channels, activeGroup, query]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  // Probe liveness for the currently visible channels (lazy, batched).
  useEffect(() => {
    if (!hasIpc || visible.length === 0) return;
    const unchecked = visible.filter((c) => !statuses[c.id]);
    if (unchecked.length === 0) return;

    let cancelled = false;
    setStatuses((prev) => {
      const next = { ...prev };
      unchecked.forEach((c) => {
        next[c.id] = "checking";
      });
      return next;
    });

    window.electron
      .livetvCheckBatch({
        items: unchecked.map((c) => ({
          id: c.id,
          url: c.url,
          userAgent: c.userAgent,
        })),
      })
      .then((res) => {
        if (cancelled || !res?.results) return;
        setStatuses((prev) => ({ ...prev, ...res.results }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [visible, hasIpc]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = useCallback((channel) => {
    setPlaying(channel);
  }, []);

  if (!hasIpc) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>
        Live TV requires the desktop app.
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: "24px 32px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <TVIcon />
        <h1 style={{ margin: 0, fontSize: 26, color: "var(--text)" }}>Live TV</h1>
      </div>

      {/* Playlist + search row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <select
          className="text-input"
          value={activePlaylist?.id || ""}
          onChange={(e) => {
            const pl = playlists.find((p) => p.id === e.target.value);
            if (pl) setActivePlaylist(pl);
          }}
          style={{ minWidth: 200 }}
        >
          {playlists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text3)",
            }}
          >
            <SearchIcon />
          </span>
          <input
            type="text"
            className="text-input"
            placeholder="Search channels…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            style={{ width: "100%", paddingLeft: 38 }}
          />
        </div>

        <button
          className="btn btn-ghost"
          onClick={async () => {
            await window.electron?.livetvClearCache?.();
            loadPlaylist(activePlaylist);
          }}
          title="Refresh playlist"
        >
          Refresh
        </button>
      </div>

      {/* Category chips */}
      {groups.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {["All", ...groups].map((g) => (
            <button
              key={g}
              onClick={() => {
                setActiveGroup(g);
                setVisibleCount(PAGE_SIZE);
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid var(--border)",
                background:
                  activeGroup === g ? "var(--primary)" : "var(--surface)",
                color: activeGroup === g ? "#fff" : "var(--text2)",
              }}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div className="spinner" style={{ margin: "0 auto" }} />
          <div style={{ marginTop: 12, color: "var(--text3)" }}>
            Loading channels…
          </div>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text2)" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text3)" }}>
            {filtered.length} channel{filtered.length === 1 ? "" : "s"}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 12,
            }}
          >
            {visible.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                status={statuses[channel.id]}
                onPlay={handlePlay}
              />
            ))}
          </div>

          {visible.length < filtered.length && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                className="btn"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load more ({filtered.length - visible.length} remaining)
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text3)",
              }}
            >
              No channels match your filters.
            </div>
          )}
        </>
      )}

      {playing && (
        <LivePlayer channel={playing} onClose={() => setPlaying(null)} />
      )}
    </div>
  );
}
