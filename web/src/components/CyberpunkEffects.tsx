"use client";

import { useEffect, useRef } from "react";
import { Cursor } from "./Cursor";

export function CyberpunkEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Matrix rain effect
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?";
    const matrixArray = matrix.split("");

    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100;
    }

    function draw() {
      if (!ctx || !canvas) return;

      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00a8b5";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
        const opacity = Math.random();
        ctx.fillStyle = `rgba(0, 168, 181, ${opacity})`;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 35);

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <Cursor />

      {/* Matrix Rain Background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none opacity-20"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: "screen",
          zIndex: 1,
        }}
      />

      {/* Grain Overlay */}
      <div
        id="grain-overlay"
        className="pointer-events-none"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2 
        }}
      />

      {/* Scanlines */}
      <div
        id="scanlines"
        className="pointer-events-none"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 3 
        }}
      />
    </>
  );
}

