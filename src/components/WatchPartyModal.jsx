import React, { useState, useEffect, useRef } from "react";
import { CloseIcon, PartyIcon } from "./Icons";
import Peer from "peerjs";

let globalPeer = null;
let globalConns = [];

export default function WatchPartyModal({ onClose, webviewRef, title }) {
  const [peerId, setPeerId] = useState("");
  const [joinId, setJoinId] = useState("");
  const [status, setStatus] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);

  const [mode, setMode] = useState("select"); // select, host, join
  
  const pollingRef = useRef(null);

  // Clean up on unmount ONLY if we are closing the modal without an active party
  // Actually, we want the party to persist in the background if they close the modal!
  // But wait, the webviewRef might change. For simplicity, if they close the modal, the party continues,
  // but we need a global reference to the webview.
  // To keep it simple: Watch party only active while modal is open? No, that blocks watching!
  // Let's just put the logic inside the page component or a custom hook.
  // Actually, let's keep the logic here, but pass the active party state up to the page so it can render a small badge.
  // Wait, I will just do it inside the modal for now. The modal can be a floating pill when minimized!
  
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startHosting = () => {
    setMode("host");
    setStatus("Generating Party ID...");
    
    if (globalPeer) {
      globalPeer.destroy();
      globalConns = [];
    }
    
    const peer = new Peer();
    globalPeer = peer;
    
    peer.on("open", (id) => {
      setPeerId(id);
      setStatus("Waiting for friends to join...");
      setIsHost(true);
      
      // Start broadcasting host playback state every 2 seconds
      pollingRef.current = setInterval(() => {
        if (!webviewRef.current || globalConns.length === 0) return;
        webviewRef.current.executeJavaScript(`
          (function() {
            var v = document.querySelector('video');
            if (v) {
              return { time: v.currentTime, playing: !v.paused };
            }
            return null;
          })();
        `).then((state) => {
          if (state) {
            globalConns.forEach(conn => {
              if (conn.open) conn.send({ type: "sync", ...state });
            });
          }
        }).catch(() => {});
      }, 2000);
    });

    peer.on("connection", (conn) => {
      globalConns.push(conn);
      setConnectedUsers(globalConns.length);
      
      conn.on("close", () => {
        globalConns = globalConns.filter(c => c !== conn);
        setConnectedUsers(globalConns.length);
      });
    });
    
    peer.on("error", (err) => {
      setStatus(`Error: ${err.type}`);
    });
  };

  const joinParty = () => {
    if (!joinId) return;
    setMode("join");
    setStatus("Connecting to Host...");
    
    if (globalPeer) {
      globalPeer.destroy();
      globalConns = [];
    }
    
    const peer = new Peer();
    globalPeer = peer;
    
    peer.on("open", () => {
      const conn = peer.connect(joinId);
      
      conn.on("open", () => {
        setStatus("Connected to Party!");
        globalConns = [conn];
        
        conn.on("data", (data) => {
          if (data.type === "sync" && webviewRef.current) {
            webviewRef.current.executeJavaScript(`
              (function() {
                var v = document.querySelector('video');
                if (v) {
                  if (Math.abs(v.currentTime - ${data.time}) > 2) {
                    v.currentTime = ${data.time};
                  }
                  if (${data.playing} && v.paused) v.play().catch(e=>{});
                  else if (!${data.playing} && !v.paused) v.pause();
                }
              })();
            `).catch(() => {});
          }
        });
      });
      
      conn.on("close", () => {
        setStatus("Host disconnected.");
      });
    });
    
    peer.on("error", (err) => {
      setStatus(`Error: ${err.type}`);
    });
  };

  const leaveParty = () => {
    if (globalPeer) globalPeer.destroy();
    globalPeer = null;
    globalConns = [];
    setMode("select");
    setPeerId("");
    setJoinId("");
    setStatus("");
    setIsHost(false);
    setConnectedUsers(0);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  if (minimized) {
    return (
      <div
        style={{
          position: "fixed",
          top: 80,
          right: 20,
          zIndex: 99999,
          background: "var(--surface)",
          border: "1px solid var(--primary)",
          borderRadius: 24,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          cursor: "pointer",
        }}
        onClick={() => setMinimized(false)}
      >
        <PartyIcon size={16} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {isHost ? `Hosting (${connectedUsers})` : "In Party"}
        </span>
      </div>
    );
  }

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
      onClick={() => setMinimized(true)}
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
              <PartyIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Watch Party</div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginTop: 2 }}>{title}</div>
            </div>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 4 }}
            title="Close entirely"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {mode === "select" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                className="btn btn-primary"
                style={{ padding: "16px", fontSize: 16 }}
                onClick={startHosting}
              >
                Host a Party
              </button>
              <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 13 }}>OR</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Paste Party ID..."
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn" onClick={joinParty} disabled={!joinId}>
                  Join
                </button>
              </div>
            </div>
          )}

          {mode === "host" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12 }}>{status}</div>
              {peerId ? (
                <>
                  <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>Share this ID with friends:</div>
                  <div style={{ 
                    background: "var(--surface2)", 
                    padding: "16px", 
                    borderRadius: 8, 
                    fontSize: 20, 
                    fontWeight: 700,
                    letterSpacing: 2,
                    marginBottom: 16,
                    userSelect: "all"
                  }}>
                    {peerId}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600, marginBottom: 24 }}>
                    {connectedUsers} Friends Joined
                  </div>
                </>
              ) : (
                <div className="spinner" style={{ margin: "20px auto" }} />
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setMinimized(true)}>Minimize</button>
                <button className="btn" style={{ flex: 1, background: "rgba(255,60,60,0.1)", color: "var(--red)" }} onClick={leaveParty}>End Party</button>
              </div>
            </div>
          )}

          {mode === "join" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{status}</div>
              <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>
                Your video playback is now synced to the host.
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setMinimized(true)}>Minimize</button>
                <button className="btn" style={{ flex: 1, background: "rgba(255,60,60,0.1)", color: "var(--red)" }} onClick={leaveParty}>Leave Party</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
