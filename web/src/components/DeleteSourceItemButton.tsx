"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audioManager";

export function DeleteSourceItemButton({ 
  flowId, 
  itemId 
}: { 
  flowId: string; 
  itemId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const onClick = async () => {
    audioManager.playClick();
    if (!confirm("Delete this item permanently?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/items/${itemId}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        audioManager.playTaskComplete();
        window.location.reload();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete item");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={isDeleting}
      className="ml-2 rounded-full w-4 h-4 flex items-center justify-center text-[10px] transition-all opacity-40 hover:opacity-100"
      style={{ 
        color: 'var(--neon-pink)',
        border: '1px solid var(--neon-pink)',
      }}
      onMouseEnter={(e) => {
        audioManager.playHover();
        e.currentTarget.style.backgroundColor = 'var(--neon-pink)';
        e.currentTarget.style.color = 'black';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--neon-pink)';
      }}
      title="Delete Item"
    >
      ×
    </button>
  );
}

