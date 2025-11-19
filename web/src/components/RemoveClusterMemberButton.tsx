"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audioManager";

type Props = {
  flowId: string;
  clusterId: string;
  memberId: string;
};

export function RemoveClusterMemberButton({ flowId, clusterId, memberId }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent details/summary toggle if clicked
    audioManager.playClick();
    
    if (!confirm("Remove this item from the cluster?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/clusters/${clusterId}/members/${memberId}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        audioManager.playTaskComplete();
        window.location.reload();
      } else {
        alert("Failed to remove item");
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
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-900/30 text-red-400 absolute top-2 right-2"
      title="Remove from Cluster"
    >
      {isDeleting ? (
        <span className="animate-spin inline-block text-xs">↻</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      )}
    </button>
  );
}

