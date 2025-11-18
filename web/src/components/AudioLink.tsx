"use client";

import Link from "next/link";
import { audioManager } from "@/lib/audioManager";
import { ComponentProps } from "react";

export function AudioLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onMouseEnter={() => audioManager.playHover()}
      onClick={() => audioManager.playClick()}
    >
      {children}
    </Link>
  );
}

