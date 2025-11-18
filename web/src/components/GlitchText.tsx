"use client";

import { ReactNode } from "react";

interface GlitchTextProps {
  children: ReactNode;
  className?: string;
}

export function GlitchText({ children, className = "" }: GlitchTextProps) {
  const text = typeof children === "string" ? children : String(children);
  
  return (
    <span
      className={`glitch-text ${className}`}
      data-text={text}
      style={{
        position: "relative",
        color: "#00a8b5",
        textShadow: "0 0 5px #00a8b5, 0 0 10px #00a8b5, 0 0 15px #00a8b5, 0 0 20px #00a8b5",
      }}
    >
      {children}
    </span>
  );
}

