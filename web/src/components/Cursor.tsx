"use client";

import { useEffect } from "react";

export function Cursor() {
  useEffect(() => {
    // Custom cursor is now optional - default cursor is visible
    // This component can be removed or kept for optional enhancement
    const cursor = document.getElementById("custom-cursor");
    const cursorDot = document.getElementById("cursor-dot");

    // Hide custom cursor elements by default since we're using default cursor
    if (cursor) cursor.style.display = "none";
    if (cursorDot) cursorDot.style.display = "none";

    // Optional: Uncomment below to enable custom cursor on hover over specific elements
    /*
    const handleMouseMove = (e: MouseEvent) => {
      if (cursor) {
        cursor.style.left = e.clientX + "px";
        cursor.style.top = e.clientY + "px";
      }
      if (cursorDot) {
        cursorDot.style.left = e.clientX + "px";
        cursorDot.style.top = e.clientY + "px";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    */
  }, []);

  // Return empty fragment - custom cursor disabled, using default cursor
  return null;
}

