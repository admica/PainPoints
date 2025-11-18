"use client";

import React from "react";
import { audioManager } from "@/lib/audioManager";

export function NewFlowForm() {
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    audioManager.playClick();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      alert("Failed to create flow");
      return;
    }
    const data = await res.json();
    audioManager.playTaskComplete();
    window.location.href = `/flows/${data.flow.id}`;
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="relative">
        <label className="block text-sm font-bold mb-2" style={{
          fontFamily: 'var(--font-geist-mono)',
          color: '#00a8b5',
          textShadow: '0 0 5px #00a8b5',
          letterSpacing: '1px'
        }}>
          &gt; FLOW_NAME:
        </label>
        <input
          className="w-full px-4 py-3 outline-none transition-all font-mono"
          style={{ 
            background: 'rgba(0, 0, 0, 0.6)',
            border: '2px solid #00a8b5',
            color: '#00a8b5',
            fontFamily: 'var(--font-geist-mono)',
            boxShadow: '0 0 10px rgba(0, 168, 181, 0.3), inset 0 0 10px rgba(0, 168, 181, 0.1)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 168, 181, 0.6), inset 0 0 20px rgba(0, 168, 181, 0.2)';
            e.currentTarget.style.borderColor = '#00a8b5';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 168, 181, 0.3), inset 0 0 10px rgba(0, 168, 181, 0.1)';
            e.currentTarget.style.borderColor = '#00a8b5';
          }}
          name="name"
          placeholder="> ENTER_FLOW_NAME"
          required
        />
      </div>
      <div className="relative">
        <label className="block text-sm font-bold mb-2 text-neon-green" style={{
          fontFamily: 'var(--font-geist-mono)',
          textShadow: '0 0 5px #39ff14',
          letterSpacing: '1px'
        }}>
          &gt; DESCRIPTION [OPTIONAL]:
        </label>
        <input
          className="w-full px-4 py-3 outline-none transition-all font-mono"
          style={{ 
            background: 'rgba(0, 0, 0, 0.6)',
            border: '2px solid #39ff14',
            color: '#39ff14',
            fontFamily: 'var(--font-geist-mono)',
            boxShadow: '0 0 10px rgba(57, 255, 20, 0.3), inset 0 0 10px rgba(57, 255, 20, 0.1)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(57, 255, 20, 0.6), inset 0 0 20px rgba(57, 255, 20, 0.2)';
            e.currentTarget.style.borderColor = '#39ff14';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '0 0 10px rgba(57, 255, 20, 0.3), inset 0 0 10px rgba(57, 255, 20, 0.1)';
            e.currentTarget.style.borderColor = '#39ff14';
          }}
          name="description"
          placeholder="> ENTER_DESCRIPTION"
        />
      </div>
      <div className="flex justify-start">
        <button
          type="submit"
          className="px-6 py-3 font-bold uppercase neon-glow-cyan hover-glow transition-all duration-300 relative overflow-hidden"
          style={{ 
            border: '2px solid #00a8b5',
            color: '#00a8b5',
            background: 'rgba(0, 168, 181, 0.15)',
            fontFamily: 'var(--font-geist-mono)',
            letterSpacing: '2px',
            textShadow: '0 0 10px #00a8b5',
            width: 'auto',
            minWidth: '200px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            audioManager.playHover();
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 168, 181, 0.8), inset 0 0 30px rgba(0, 168, 181, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.background = 'rgba(0, 168, 181, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 168, 181, 0.5), inset 0 0 20px rgba(0, 168, 181, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(0, 168, 181, 0.15)';
          }}
          onClick={() => audioManager.playClick()}
        >
          [INITIALIZE_FLOW]
        </button>
      </div>
    </form>
  );
}


