"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audioManager";

type Props = {
  flowId: string;
  clusterId: string;
};

export function DeleteClusterButton({ flowId, clusterId }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  const onClick = async () => {
    audioManager.playClick();
    if (!confirm("Delete this cluster? The source items will remain available for re-analysis.")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/clusters/${clusterId}`, { method: "DELETE" });
      if (res.ok) {
        audioManager.playTaskComplete();
        window.location.reload();
      } else {
        alert("Failed to delete cluster");
        setIsDeleting(false);
      }
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isDeleting}
      className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-900/30 text-red-400"
      title="Delete Cluster"
    >
      {isDeleting ? (
        <span className="animate-spin inline-block">↻</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      )}
    </button>
  );
}
