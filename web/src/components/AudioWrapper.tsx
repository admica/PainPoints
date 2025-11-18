"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { audioManager } from "@/lib/audioManager";

export function AudioWrapper() {
  const pathname = usePathname();

  useEffect(() => {
    // Determine page music based on route
    if (pathname === "/") {
      audioManager.setPageMusic("landing");
    } else if (pathname.startsWith("/flows")) {
      audioManager.setPageMusic("flows");
    } else {
      audioManager.setPageMusic("none");
    }
  }, [pathname]);

  return null;
}

