import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CyberpunkEffects } from "@/components/CyberpunkEffects";
import { AudioControls } from "@/components/AudioControls";
import { AudioWrapper } from "@/components/AudioWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pain Point Analyzer | Cyberpunk Interface",
  description: "Ultra-premium cyberpunk pain point analysis system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CyberpunkEffects />
        <AudioWrapper />
        <AudioControls />
        {children}
      </body>
    </html>
  );
}
