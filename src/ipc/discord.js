const { ipcMain } = require("electron");
const DiscordRPC = require("discord-rpc");

const clientId = "1319246193798676571"; // Replace with actual Streambert client ID
let rpc = null;
let rpcReady = false;

function connect() {
  if (rpc) return;
  rpc = new DiscordRPC.Client({ transport: "ipc" });
  
  rpc.on("ready", () => {
    rpcReady = true;
    console.log("Discord RPC ready");
  });

  rpc.login({ clientId }).catch(() => {
    // Discord might not be running
    rpc = null;
    rpcReady = false;
  });
}

function updatePresence(details) {
  if (!rpcReady || !rpc) return;
  try {
    rpc.setActivity({
      details: details.details, // e.g. "Watching Movie Name"
      state: details.state,     // e.g. "Season 1 Episode 2"
      startTimestamp: details.startTimestamp || undefined,
      largeImageKey: "streambert_logo", // You'll need to upload this to Discord Developer Portal
      largeImageText: "Streambert",
      instance: false,
    });
  } catch (e) {
    console.error("Failed to update Discord presence", e);
  }
}

function clearPresence() {
  if (!rpcReady || !rpc) return;
  try {
    rpc.clearActivity();
  } catch (e) {}
}

function register() {
  connect();

  ipcMain.handle("update-discord-presence", (_, details) => {
    if (details === null) {
      clearPresence();
    } else {
      updatePresence(details);
    }
  });
}

module.exports = { register };
