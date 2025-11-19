"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audioManager";

type Props = {
  flowId: string;
  clusterId: string;
  initialLabel: string;
  initialSummary: string | null;
};

export function EditClusterButton({ flowId, clusterId, initialLabel, initialSummary }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const [summary, setSummary] = useState(initialSummary || "");

  const onSave = async () => {
    audioManager.playClick();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/clusters/${clusterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, summary }),
      });

      if (res.ok) {
        audioManager.playTaskComplete();
        window.location.reload();
      } else {
        alert("Failed to update cluster");
        setIsSaving(false);
      }
    } catch (e) {
      console.error(e);
      alert("Error saving changes");
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg glass-panel p-6 rounded-lg border border-neon-cyan shadow-[0_0_20px_rgba(0,168,181,0.3)]">
          <h3 className="text-lg font-bold text-neon-cyan mb-4">Edit Cluster</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-neon-cyan outline-none"
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Summary / Pain</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-neon-cyan outline-none resize-none"
                disabled={isSaving}
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm hover:text-white text-text-muted transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-neon-cyan/20 text-neon-cyan border border-neon-cyan rounded hover:bg-neon-cyan/30 transition-all flex items-center gap-2"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        audioManager.playClick();
        setIsEditing(true);
      }}
      className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-cyan-900/30 text-cyan-400 mr-2"
      title="Edit Cluster"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
      </svg>
    </button>
  );
}

