"use client";

import React, { useState } from "react";
import { audioManager } from "@/lib/audioManager";

export function PasteIngestForm({ flowId }: { flowId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    audioManager.playClick();

    const formData = new FormData(e.currentTarget);
    const text = String(formData.get("text") ?? "").trim();

    if (!text) {
      setMessage({ type: 'error', text: 'Please enter some text to add.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/flows/${flowId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "paste", text }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error: ${errorText}`);
      }

      const result = await res.json();

      // Clear the form
      (e.target as HTMLFormElement).reset();

      setMessage({
        type: 'success',
        text: `Successfully added ${result.items?.length || 0} items to the flow.`
      });

      audioManager.playTaskComplete();

      // Trigger page refresh after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Ingest error:", error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add data. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <textarea
        name="text"
        placeholder="Paste posts or comment snippets here… Separate items with blank lines."
        className="min-h-[140px] w-full rounded-md border p-3 outline-none transition-all resize-y"
        style={{ 
          backgroundColor: 'var(--bg-elevated)', 
          color: 'var(--text-primary)',
          borderColor: 'var(--border-color)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--neon-cyan)';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 255, 255, 0.2)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        disabled={isSubmitting}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-md px-4 py-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style={{ backgroundColor: 'var(--neon-cyan)', color: 'var(--bg-primary)' }}
        onMouseEnter={(e) => {
          if (!isSubmitting) {
            audioManager.playHover();
            e.currentTarget.style.boxShadow = '0 0 4px var(--glow-cyan), 0 0 8px var(--glow-cyan)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isSubmitting && (
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }}></div>
        )}
        {isSubmitting ? 'Adding...' : 'Add to Flow'}
      </button>

      {message && (
        <div className="p-3 rounded-md text-sm border"
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
    </form>
  );
}


