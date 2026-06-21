import React, { useState, useEffect } from "react";
import { CloseIcon, CastIcon } from "./Icons";

export default function CastModal({ onClose, mediaUrl, title, posterPath }) {
  const [devices, setDevices] = useState([]);
  const [castingTo, setCastingTo] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    window.electron.getCastDevices().then((devs) => {
      if (mounted) {
        setDevices(devs || []);
        setIsScanning(false);
      }
    });

    // Subscribe to discovery updates
    const handler = window.electron.onCastDevicesUpdated((devs) => {
      if (mounted) setDevices(devs || []);
    });

    return () => {
      mounted = false;
      window.electron.offCastDevicesUpdated(handler);
    };
  }, []);

  const handleCast = async (deviceName) => {
    if (!mediaUrl) {
      setError("No playable media URL available to cast.");
      return;
    }
    setError(null);
    setCastingTo(deviceName);
    try {
      const res = await window.electron.castMedia({
        deviceName,
        url: mediaUrl,
        title,
        poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : ""
      });
      if (!res.ok) {
        setError(res.error);
        setCastingTo(null);
      } else {
        onClose(); // Successfully started casting
      }
    } catch (err) {
      setError(err.message);
      setCastingTo(null);
    }
  };

  const handleStopCast = async () => {
    try {
      await window.electron.castStop();
      setCastingTo(null);
    } catch (err) {
      setError(err.message);
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
          width: 400,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: "var(--primary)" }}>
              <CastIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Cast to Device</div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{title}</div>
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

        <div style={{ padding: 20, flex: 1 }}>
          {error && (
            <div style={{ padding: 12, background: "rgba(255, 60, 60, 0.1)", color: "var(--red)", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {devices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text3)" }}>
              {isScanning ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div className="spinner" />
                  <span>Looking for devices...</span>
                </div>
              ) : (
                "No Chromecast devices found on your network."
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {devices.map((devName) => (
                <button
                  key={devName}
                  className="btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    background: castingTo === devName ? "var(--primary)" : "var(--surface2)",
                    color: castingTo === devName ? "#fff" : "var(--text)",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.2s",
                  }}
                  onClick={() => handleCast(devName)}
                  disabled={castingTo === devName}
                >
                  <span style={{ fontWeight: 500 }}>{devName}</span>
                  {castingTo === devName && (
                    <div className="spinner" style={{ width: 16, height: 16, borderLeftColor: "#fff" }} />
                  )}
                </button>
              ))}
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", padding: 10, color: "var(--red)", border: "1px solid rgba(255, 60, 60, 0.2)" }}
                  onClick={handleStopCast}
                >
                  Stop Casting
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
