"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { audioManager } from "@/lib/audioManager";

export function AudioControls() {
  const pathname = usePathname();
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSFXEnabled] = useState(true);

  useEffect(() => {
    setMusicEnabled(audioManager.isMusicEnabled());
    setSFXEnabled(audioManager.isSFXEnabled());
  }, []);

  // Only show controls on the landing page
  if (pathname !== "/") {
    return null;
  }

  const handleMusicToggle = () => {
    const enabled = audioManager.toggleMusic();
    setMusicEnabled(enabled);
  };

  const handleSFXToggle = () => {
    const enabled = audioManager.toggleSFX();
    setSFXEnabled(enabled);
  };

  return (
    <div 
      className="fixed top-4 right-4 flex gap-3" 
      style={{ 
        position: 'fixed', 
        top: '1rem', 
        right: '1rem', 
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <button
        type="button"
        className="px-3 py-2 text-lg font-bold transition-all duration-300 hover:scale-110"
        style={{
          color: musicEnabled ? "rgba(0, 168, 181, 0.5)" : "rgba(102, 102, 102, 0.4)",
          textShadow: musicEnabled ? "0 0 4px rgba(0, 168, 181, 0.3)" : "none",
          fontFamily: "var(--font-geist-mono)",
          background: "rgba(0, 0, 0, 0.3)",
          border: `1px solid ${musicEnabled ? "rgba(0, 168, 181, 0.3)" : "rgba(102, 102, 102, 0.2)"}`,
          borderRadius: "4px",
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 10000,
        }}
        onMouseEnter={(e) => {
          audioManager.playHover();
          e.currentTarget.style.color = "rgba(0, 168, 181, 0.8)";
          e.currentTarget.style.borderColor = "rgba(0, 168, 181, 0.6)";
          e.currentTarget.style.textShadow = "0 0 8px rgba(0, 168, 181, 0.5)";
          e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 168, 181, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = musicEnabled ? "rgba(0, 168, 181, 0.5)" : "rgba(102, 102, 102, 0.4)";
          e.currentTarget.style.borderColor = musicEnabled ? "rgba(0, 168, 181, 0.3)" : "rgba(102, 102, 102, 0.2)";
          e.currentTarget.style.textShadow = musicEnabled ? "0 0 4px rgba(0, 168, 181, 0.3)" : "none";
          e.currentTarget.style.boxShadow = "none";
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          audioManager.playClick();
          handleMusicToggle();
        }}
        title={musicEnabled ? "Music: ON" : "Music: OFF"}
      >
        ♫
      </button>
      <button
        type="button"
        className="px-3 py-2 text-sm font-bold transition-all duration-300 hover:scale-110"
        style={{
          color: sfxEnabled ? "rgba(57, 255, 20, 0.4)" : "rgba(102, 102, 102, 0.3)",
          textShadow: sfxEnabled ? "0 0 3px rgba(57, 255, 20, 0.2)" : "none",
          fontFamily: "var(--font-geist-mono)",
          background: "rgba(0, 0, 0, 0.25)",
          border: `1px solid ${sfxEnabled ? "rgba(57, 255, 20, 0.25)" : "rgba(102, 102, 102, 0.15)"}`,
          borderRadius: "4px",
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 10000,
          letterSpacing: '1px',
        }}
        onMouseEnter={(e) => {
          audioManager.playHover();
          e.currentTarget.style.color = "rgba(57, 255, 20, 0.7)";
          e.currentTarget.style.borderColor = "rgba(57, 255, 20, 0.5)";
          e.currentTarget.style.textShadow = "0 0 6px rgba(57, 255, 20, 0.4)";
          e.currentTarget.style.boxShadow = "0 0 8px rgba(57, 255, 20, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = sfxEnabled ? "rgba(57, 255, 20, 0.4)" : "rgba(102, 102, 102, 0.3)";
          e.currentTarget.style.borderColor = sfxEnabled ? "rgba(57, 255, 20, 0.25)" : "rgba(102, 102, 102, 0.15)";
          e.currentTarget.style.textShadow = sfxEnabled ? "0 0 3px rgba(57, 255, 20, 0.2)" : "none";
          e.currentTarget.style.boxShadow = "none";
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          audioManager.playClick();
          handleSFXToggle();
        }}
        title={sfxEnabled ? "SFX: ON" : "SFX: OFF"}
      >
        SFX
      </button>
    </div>
  );
}

