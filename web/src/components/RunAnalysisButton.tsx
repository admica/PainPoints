"use client";

import React, { useState, useRef, useEffect } from "react";
import { audioManager } from "@/lib/audioManager";

export function RunAnalysisButton({ id }: { id: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mode, setMode] = useState<"full" | "refine">("refine");
  const [showMenu, setShowMenu] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onClick = async () => {
    audioManager.playClick();
    setIsAnalyzing(true);
    setMessage(null);
    setShowMenu(false);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("analysis-started", { detail: { flowId: id } }));
    }

    try {
      const res = await fetch(`/api/flows/${id}/analyze`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Analysis failed: ${errorText}`);
      }

      setMessage({
        type: 'success',
        text: 'Analysis completed successfully!'
      });
      audioManager.playTaskComplete();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("analysis-finished", { detail: { flowId: id } }));
      }

      // Refresh page after showing success message
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Analysis error:", error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Analysis failed. Please try again.'
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("analysis-finished", { detail: { flowId: id } }));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex items-center">
        <button
          onClick={onClick}
          disabled={isAnalyzing}
          className="rounded-l-md px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ 
            backgroundColor: 'var(--neon-green)', 
            color: 'var(--bg-primary)',
            borderRight: '1px solid rgba(0,0,0,0.2)'
          }}
          onMouseEnter={(e) => {
            if (!isAnalyzing) {
              audioManager.playHover();
              e.currentTarget.style.boxShadow = '0 0 4px var(--glow-green), 0 0 8px var(--glow-green)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isAnalyzing && (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }}></div>
          )}
          {isAnalyzing ? 'Analyzing...' : (mode === "refine" ? "Refine & Add" : "Fresh Analysis")}
        </button>

        <button
          disabled={isAnalyzing}
          onClick={() => {
            audioManager.playClick();
            setShowMenu(!showMenu);
          }}
          className="rounded-r-md px-2 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--neon-green)', color: 'var(--bg-primary)' }}
          onMouseEnter={(e) => {
            if (!isAnalyzing) {
              audioManager.playHover();
              e.currentTarget.style.boxShadow = '0 0 4px var(--glow-green), 0 0 8px var(--glow-green)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ▼
        </button>
      </div>

      {showMenu && (
        <div 
          ref={menuRef}
          className="absolute top-full right-0 mt-2 w-56 rounded-md border shadow-lg z-50"
          style={{ 
            backgroundColor: 'var(--bg-elevated)', 
            borderColor: 'var(--border-color)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="p-2 flex flex-col gap-1">
            <button
              onClick={() => {
                setMode("refine");
                setShowMenu(false);
                audioManager.playClick();
              }}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${mode === "refine" ? "bg-opacity-20 bg-green-500" : "hover:bg-white hover:bg-opacity-5"}`}
              style={{ color: mode === "refine" ? 'var(--neon-green)' : 'var(--text-primary)' }}
            >
              <div className="font-bold">Refine & Add</div>
              <div className="text-xs opacity-70">Keep existing clusters, add new items</div>
            </button>
            <button
              onClick={() => {
                setMode("full");
                setShowMenu(false);
                audioManager.playClick();
              }}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${mode === "full" ? "bg-opacity-20 bg-cyan-500" : "hover:bg-white hover:bg-opacity-5"}`}
              style={{ color: mode === "full" ? 'var(--neon-cyan)' : 'var(--text-primary)' }}
            >
              <div className="font-bold">Fresh Analysis</div>
              <div className="text-xs opacity-70">Delete all clusters, restart</div>
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="p-2 rounded-md text-xs border"
        style={{
          borderColor: message.type === 'success' 
            ? 'var(--neon-green)' 
            : 'var(--neon-pink)',
          backgroundColor: message.type === 'success' 
            ? 'rgba(0, 255, 136, 0.1)' 
            : 'rgba(255, 0, 128, 0.1)',
          color: message.type === 'success' 
            ? 'var(--neon-green)' 
            : 'var(--neon-pink)'
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
