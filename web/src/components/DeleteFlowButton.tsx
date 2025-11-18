"use client";

import { audioManager } from "@/lib/audioManager";

export function DeleteFlowButton({ id }: { id: string }) {
  const onClick = async () => {
    audioManager.playClick();
    if (!confirm("Delete this flow?")) return;
    const res = await fetch(`/api/flows/${id}`, { method: "DELETE" });
    if (res.ok) {
      audioManager.playTaskComplete();
      window.location.href = "/";
    } else {
      alert("Failed to delete");
    }
  };
  return (
    <button
      onClick={onClick}
      className="rounded-md border px-3 py-1.5 text-sm transition-all"
      style={{ 
        borderColor: 'var(--neon-pink)', 
        color: 'var(--neon-pink)',
        backgroundColor: 'transparent'
      }}
      onMouseEnter={(e) => {
        audioManager.playHover();
        e.currentTarget.style.backgroundColor = 'var(--neon-pink)';
        e.currentTarget.style.color = 'var(--bg-primary)';
        e.currentTarget.style.boxShadow = '0 0 4px var(--glow-magenta), 0 0 8px var(--glow-magenta)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--neon-pink)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      Delete
    </button>
  );
}


