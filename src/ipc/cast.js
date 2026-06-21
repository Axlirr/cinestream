const { ipcMain } = require("electron");
const ChromecastAPI = require("chromecast-api");

let client = null;
let devices = [];
let currentDevice = null;
let updateCallback = null;

function connect() {
  if (client) return;
  client = new ChromecastAPI();
  
  client.on("device", function (device) {
    if (!devices.find(d => d.name === device.name)) {
      devices.push(device);
      if (updateCallback) updateCallback(devices.map(d => d.name));
    }
  });
}

function register(getMainWindow) {
  connect();

  updateCallback = (deviceNames) => {
    const mw = getMainWindow();
    if (mw && !mw.isDestroyed()) {
      mw.webContents.send("cast-devices-updated", deviceNames);
    }
  };

  ipcMain.handle("get-cast-devices", () => {
    client.update(); // trigger discovery again just in case
    return devices.map(d => d.name);
  });

  ipcMain.handle("cast-media", async (_, { deviceName, url, title, poster }) => {
    const device = devices.find(d => d.name === deviceName);
    if (!device) return { ok: false, error: "Device not found" };
    
    currentDevice = device;
    
    return new Promise((resolve) => {
      const media = {
        url: url,
        subtitles: [],
        cover: {
          title: title || "Streambert Media",
          url: poster || ""
        }
      };
      
      device.play(media, function (err) {
        if (err) {
          resolve({ ok: false, error: err.message });
        } else {
          resolve({ ok: true });
        }
      });
    });
  });

  ipcMain.handle("cast-stop", async () => {
    if (!currentDevice) return { ok: true };
    return new Promise((resolve) => {
      currentDevice.stop(function (err) {
        if (err) resolve({ ok: false, error: err.message });
        else resolve({ ok: true });
      });
    });
  });
}

module.exports = { register };
