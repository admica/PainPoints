"use client";

import { ReactNode } from "react";

interface GlitchTextProps {
  children: ReactNode;
  className?: string;
}

/* 
  Updated to remove glitch effect and heavy text shadows.
  Now renders clean text in the accent color.
*/
export function GlitchText({ children, className = "" }: GlitchTextProps) {
  return (
    <span
      className={`text-neon-cyan font-semibold ${className}`}
    >
      {children}
    </span>
  );
}
