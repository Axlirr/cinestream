// ── IPC: Live TV (IPTV M3U) ───────────────────────────────────────────────────
// Fetches and parses M3U playlists in the main process (bypasses renderer CORS),
// caches results, and performs lightweight channel status probes.
//
// M3U parsing logic adapted from the IPTV-Org provider pattern: read #EXTINF
// attribute tags (tvg-logo, group-title, tvg-id, http-user-agent), honour
// #EXTVLCOPT user-agent lines, and pair each metadata block with the URL that
// follows it.
//
// Exposes register() following the same pattern as the other IPC modules.

const { ipcMain, net } = require("electron");

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Built-in playlist sources. Users can also add custom URLs from the UI.
const BUILTIN_PLAYLISTS = [
  {
    id: "iptv-org-all",
    name: "IPTV-Org · All World",
    url: "https://iptv-org.github.io/iptv/index.m3u",
  },
  {
    id: "iptv-org-news",
    name: "IPTV-Org · News",
    url: "https://iptv-org.github.io/iptv/categories/news.m3u",
  },
  {
    id: "iptv-org-movies",
    name: "IPTV-Org · Movies",
    url: "https://iptv-org.github.io/iptv/categories/movies.m3u",
  },
  {
    id: "iptv-org-sports",
    name: "IPTV-Org · Sports",
    url: "https://iptv-org.github.io/iptv/categories/sports.m3u",
  },
];

// ── Playlist cache (30 min TTL, keyed by URL) ────────────────────────────────
const CACHE_TTL = 30 * 60 * 1000;
const _cache = new Map(); // url → { channels, ts }

// ── Helpers ──────────────────────────────────────────────────────────────────

// Fetch text over the network using Electron's net module (respects system proxy).
function fetchText(url, { timeout = 30000, userAgent = DEFAULT_UA } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    let req;
    try {
      req = net.request({ method: "GET", url });
    } catch (e) {
      return reject(e);
    }
    req.setHeader("User-Agent", userAgent);

    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {}
      finish(reject, new Error("Request timed out"));
    }, timeout);

    req.on("response", (res) => {
      // Follow simple redirects
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        clearTimeout(timer);
        const loc = Array.isArray(res.headers.location)
          ? res.headers.location[0]
          : res.headers.location;
        res.on("data", () => {});
        res.on("end", () => {});
        const next = loc.startsWith("http")
          ? loc
          : new URL(loc, url).toString();
        finish(resolve, fetchText(next, { timeout, userAgent }));
        return;
      }
      if (res.statusCode !== 200) {
        clearTimeout(timer);
        res.on("data", () => {});
        res.on("end", () =>
          finish(reject, new Error(`HTTP ${res.statusCode}`)),
        );
        return;
      }
      let body = "";
      res.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      res.on("end", () => {
        clearTimeout(timer);
        finish(resolve, body);
      });
      res.on("error", (e) => {
        clearTimeout(timer);
        finish(reject, e);
      });
    });

    req.on("error", (e) => {
      clearTimeout(timer);
      finish(reject, e);
    });

    req.end();
  });
}

function matchAttr(line, attr) {
  // attr-name="value"
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = line.match(re);
  return m ? m[1] : "";
}

// Parse an M3U/M3U8 playlist into structured channel objects.
function parseM3U(raw) {
  const channels = [];
  if (!raw) return channels;

  const lines = raw.split(/\r\n|\r|\n/);
  let cur = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    if (t.startsWith("#EXTINF")) {
      // Name is everything after the last comma on the EXTINF line.
      const name = t.includes(",") ? t.slice(t.lastIndexOf(",") + 1).trim() : "";
      cur = {
        name,
        logo: matchAttr(t, "tvg-logo"),
        group: matchAttr(t, "group-title"),
        tvgId: matchAttr(t, "tvg-id"),
        userAgent: matchAttr(t, "http-user-agent") || null,
        url: null,
      };
    } else if (t.startsWith("#EXTVLCOPT:http-user-agent=")) {
      if (cur) cur.userAgent = t.split("http-user-agent=")[1]?.trim() || cur.userAgent;
    } else if (t.startsWith("#EXTGRP:")) {
      if (cur && !cur.group) cur.group = t.slice("#EXTGRP:".length).trim();
    } else if (t.startsWith("#")) {
      // Other directive — ignore.
      continue;
    } else if (/^https?:\/\//i.test(t)) {
      // A URL line. Pair it with the pending metadata block (if any).
      if (cur && cur.name) {
        cur.url = t;
        cur.id = makeChannelId(cur);
        channels.push(cur);
      }
      cur = null;
    }
  }
  return channels;
}

// Stable, URL-safe id derived from the channel's distinguishing fields.
function makeChannelId(ch) {
  const raw = `${ch.url}|${ch.name}|${ch.logo || ""}|${ch.userAgent || ""}`;
  return Buffer.from(raw, "utf8").toString("base64");
}

async function getChannels(url) {
  const now = Date.now();
  const cached = _cache.get(url);
  if (cached && now - cached.ts < CACHE_TTL) return cached.channels;

  const body = await fetchText(url);
  const channels = parseM3U(body);
  _cache.set(url, { channels, ts: now });
  return channels;
}

// Lightweight liveness probe: HEAD/GET the stream URL and check we get a
// playable-looking response. Returns "live" | "dead".
function probeChannel(url, userAgent) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (status) => {
      if (settled) return;
      settled = true;
      resolve(status);
    };

    let req;
    try {
      req = net.request({ method: "GET", url });
    } catch {
      return done("dead");
    }
    req.setHeader("User-Agent", userAgent || DEFAULT_UA);
    // Only need the first bytes to know the stream answers.
    req.setHeader("Range", "bytes=0-1");

    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {}
      done("dead");
    }, 8000);

    req.on("response", (res) => {
      clearTimeout(timer);
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      try {
        req.abort();
      } catch {}
      done(ok ? "live" : "dead");
    });
    req.on("error", () => {
      clearTimeout(timer);
      done("dead");
    });
    req.end();
  });
}

// ── IPC registration ──────────────────────────────────────────────────────────

function register() {
  ipcMain.handle("livetv-get-playlists", () => BUILTIN_PLAYLISTS);

  // Load + parse a playlist. Accepts { url } or { id } for a built-in.
  ipcMain.handle("livetv-load", async (_, { url, id } = {}) => {
    try {
      let target = url;
      if (!target && id) {
        target = BUILTIN_PLAYLISTS.find((p) => p.id === id)?.url;
      }
      if (!target) return { ok: false, error: "No playlist URL" };
      const channels = await getChannels(target);
      // Build the unique sorted group list for category filtering.
      const groups = Array.from(
        new Set(channels.map((c) => c.group).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b));
      return { ok: true, channels, groups, count: channels.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Probe one channel's liveness.
  ipcMain.handle("livetv-check-channel", async (_, { url, userAgent } = {}) => {
    if (!url) return { status: "dead" };
    const status = await probeChannel(url, userAgent);
    return { status };
  });

  // Probe several at once (capped concurrency) for the "checking" badges.
  ipcMain.handle("livetv-check-batch", async (_, { items } = {}) => {
    if (!Array.isArray(items) || items.length === 0) return { results: {} };
    const CONCURRENCY = 6;
    const results = {};
    let i = 0;
    async function worker() {
      while (i < items.length) {
        const idx = i++;
        const it = items[idx];
        if (!it || !it.url) continue;
        results[it.id] = await probeChannel(it.url, it.userAgent);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker),
    );
    return { results };
  });

  // Clear the playlist cache (used by a manual "refresh" action).
  ipcMain.handle("livetv-clear-cache", () => {
    _cache.clear();
    return { ok: true };
  });
}

module.exports = { register, parseM3U, makeChannelId };
