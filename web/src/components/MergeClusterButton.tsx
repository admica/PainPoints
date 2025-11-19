"use client";

import { useState, useEffect } from "react";
import { audioManager } from "@/lib/audioManager";

type ClusterOption = {
  id: string;
  label: string;
};

type Props = {
  flowId: string;
  sourceClusterId: string;
  sourceLabel: string;
};

export function MergeClusterButton({ flowId, sourceClusterId, sourceLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [targetClusterId, setTargetClusterId] = useState("");
  const [availableClusters, setAvailableClusters] = useState<ClusterOption[]>([]);
  const [isLoadingClusters, setIsLoadingClusters] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchClusters();
    }
  }, [isOpen]);

  const fetchClusters = async () => {
    setIsLoadingClusters(true);
    try {
      const res = await fetch(`/api/flows/${flowId}`);
      const data = await res.json();
      if (data.flow?.clusters) {
        // Filter out the current cluster
        const others = data.flow.clusters
          .filter((c: any) => c.id !== sourceClusterId)
          .map((c: any) => ({ id: c.id, label: c.label }));
        setAvailableClusters(others);
      }
    } catch (e) {
      console.error("Failed to fetch clusters", e);
    } finally {
      setIsLoadingClusters(false);
    }
  };

  const onMerge = async () => {
    if (!targetClusterId) return;
    
    audioManager.playClick();
    if (!confirm(`Merge "${sourceLabel}" into the selected cluster? This cannot be undone.`)) return;

    setIsMerging(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/clusters/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceClusterId,
          targetClusterId,
        }),
      });

      if (res.ok) {
        audioManager.playTaskComplete();
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Failed to merge: ${err.error}`);
        setIsMerging(false);
      }
    } catch (e) {
      console.error(e);
      alert("Error merging clusters");
      setIsMerging(false);
    }
  };

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md glass-panel p-6 rounded-lg border border-neon-cyan shadow-[0_0_20px_rgba(0,168,181,0.3)]">
          <h3 className="text-lg font-bold text-neon-cyan mb-4">Merge Cluster</h3>
          <p className="text-sm text-text-secondary mb-4">
            Merge <span className="text-white font-semibold">"{sourceLabel}"</span> into:
          </p>
          
          <div className="space-y-4">
            {isLoadingClusters ? (
              <div className="text-center py-4 text-neon-cyan animate-pulse">Loading clusters...</div>
            ) : availableClusters.length === 0 ? (
              <div className="text-center py-4 text-text-muted">No other clusters available.</div>
            ) : (
              <select
                value={targetClusterId}
                onChange={(e) => setTargetClusterId(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-neon-cyan outline-none"
                disabled={isMerging}
              >
                <option value="">-- Select a target cluster --</option>
                {availableClusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm hover:text-white text-text-muted transition-colors"
                disabled={isMerging}
              >
                Cancel
              </button>
              <button
                onClick={onMerge}
                disabled={isMerging || !targetClusterId}
                className="px-4 py-2 text-sm bg-neon-cyan/20 text-neon-cyan border border-neon-cyan rounded hover:bg-neon-cyan/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMerging ? "Merging..." : "Merge"}
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
        setIsOpen(true);
      }}
      className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-cyan-900/30 text-cyan-400 mr-2"
      title="Merge into another cluster"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 9l3 3-3 3"></path>
        <line x1="11" y1="12" x2="3" y2="12"></line>
        <polyline points="21 9 18 12 21 15"></polyline>
        <line x1="18" y1="12" x2="14" y2="12"></line>
      </svg>
    </button>
  );
}
