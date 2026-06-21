const { ipcMain } = require("electron");

let traktConfig = {
  clientId: "",
  clientSecret: "",
  accessToken: "",
  refreshToken: "",
};

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": traktConfig.clientId,
    "Authorization": `Bearer ${traktConfig.accessToken}`,
  };
}

let pollingInterval = null;

function register(getMainWindow, secureGet, secureSet) {
  // Load config on startup
  async function loadConfig() {
    traktConfig.clientId = (await secureGet("traktClientId")) || "";
    traktConfig.clientSecret = (await secureGet("traktClientSecret")) || "";
    traktConfig.accessToken = (await secureGet("traktAccessToken")) || "";
    traktConfig.refreshToken = (await secureGet("traktRefreshToken")) || "";
  }
  loadConfig();

  ipcMain.handle("trakt-get-config", async () => {
    return {
      clientId: await secureGet("traktClientId"),
      clientSecret: await secureGet("traktClientSecret"),
      hasToken: !!(await secureGet("traktAccessToken"))
    };
  });

  ipcMain.handle("trakt-set-credentials", async (_, { clientId, clientSecret }) => {
    await secureSet("traktClientId", clientId);
    await secureSet("traktClientSecret", clientSecret);
    traktConfig.clientId = clientId;
    traktConfig.clientSecret = clientSecret;
    return { ok: true };
  });

  ipcMain.handle("trakt-start-auth", async () => {
    if (!traktConfig.clientId) return { ok: false, error: "Missing Client ID" };
    try {
      const res = await fetch("https://api.trakt.tv/oauth/device/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: traktConfig.clientId })
      });
      if (!res.ok) throw new Error("Failed to get device code");
      const data = await res.json();
      
      // Start polling
      if (pollingInterval) clearInterval(pollingInterval);
      pollingInterval = setInterval(async () => {
        try {
          const tokenRes = await fetch("https://api.trakt.tv/oauth/device/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: data.device_code,
              client_id: traktConfig.clientId,
              client_secret: traktConfig.clientSecret
            })
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            clearInterval(pollingInterval);
            await secureSet("traktAccessToken", tokenData.access_token);
            await secureSet("traktRefreshToken", tokenData.refresh_token);
            traktConfig.accessToken = tokenData.access_token;
            traktConfig.refreshToken = tokenData.refresh_token;
            
            const mw = getMainWindow();
            if (mw && !mw.isDestroyed()) mw.webContents.send("trakt-auth-success");
          } else if (tokenRes.status !== 400) {
            // 400 means pending. other errors mean expired/denied
            clearInterval(pollingInterval);
          }
        } catch (e) {
          clearInterval(pollingInterval);
        }
      }, data.interval * 1000);

      return { ok: true, userCode: data.user_code, verificationUrl: data.verification_url };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle("trakt-sync-watched", async (_, { watchedMap }) => {
    // Only syncing push for now to keep it simple
    if (!traktConfig.accessToken) return { ok: false, error: "Not authenticated" };
    try {
      // Build history array
      const movies = [];
      const episodes = [];
      
      for (const [key, isWatched] of Object.entries(watchedMap)) {
        if (!isWatched) continue;
        if (key.startsWith("mv_")) {
          movies.push({ ids: { tmdb: parseInt(key.replace("mv_", "")) } });
        } else if (key.startsWith("tv_")) {
          // tv_123_s1e1
          const match = key.match(/tv_(\d+)_s(\d+)e(\d+)/);
          if (match) {
            episodes.push({
              ids: { tmdb: parseInt(match[1]) },
              season: parseInt(match[2]),
              number: parseInt(match[3])
            });
          }
        }
      }
      
      const payload = {};
      if (movies.length) payload.movies = movies;
      if (episodes.length) payload.episodes = episodes;
      
      if (Object.keys(payload).length === 0) return { ok: true };

      const res = await fetch("https://api.trakt.tv/sync/history", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Sync failed");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
}

module.exports = { register };
