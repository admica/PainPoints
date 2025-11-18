"use client";

import React, { useState } from "react";
import { audioManager } from "@/lib/audioManager";

export function RunAnalysisButton({ id }: { id: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const onClick = async () => {
    audioManager.playClick();
    setIsAnalyzing(true);
    setMessage(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("analysis-started", { detail: { flowId: id } }));
    }

    try {
      const res = await fetch(`/api/flows/${id}/analyze`, { method: "POST" });

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
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        disabled={isAnalyzing}
        className="rounded-md px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        {isAnalyzing && (
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }}></div>
        )}
        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
      </button>

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


