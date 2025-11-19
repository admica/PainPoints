"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type IngestionProgress = {
  step: string;
  postsFound: number;
  postsProcessed: number;
  commentsProcessed: number;
  totalPosts: number;
  totalComments: number;
};

export type IngestionStatusSnapshot = {
  status: "idle" | "running" | "succeeded" | "failed";
  progress: IngestionProgress | null;
  error: string | null;
  durationMs: number | null;
};

type Props = {
  flowId: string;
  initial: IngestionStatusSnapshot;
};

export function RedditIngestionProgressCard({ flowId, initial }: Props) {
  const [statusInfo, setStatusInfo] = useState(initial);
  const [isStarting, setIsStarting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/analysis-status`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setStatusInfo({
        status: data.ingestionStatus,
        progress: data.ingestionProgress,
        error: data.ingestionError ?? null,
        durationMs: data.ingestionDurationMs ?? null,
      });

      if (data.ingestionStatus === "running") {
        setIsStarting(false);
      } else if (data.ingestionStatus !== "idle") {
        setIsStarting(false);
      }
    } catch (error) {
      console.error("Failed to fetch ingestion status:", error);
    }
  }, [flowId]);

  const isRunning = statusInfo.status === "running" || isStarting;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 1000); // Poll faster (1s) for better feedback
    return () => clearInterval(interval);
  }, [isRunning, fetchStatus]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ flowId?: string }>).detail;
      if (detail?.flowId === flowId) {
        setIsStarting(true);
        fetchStatus();
      }
    };
    window.addEventListener("ingestion-started", handler as EventListener);
    window.addEventListener("ingestion-finished", handler as EventListener);
    return () => {
      window.removeEventListener("ingestion-started", handler as EventListener);
      window.removeEventListener("ingestion-finished", handler as EventListener);
    };
  }, [flowId, fetchStatus]);

  const progressPercent = useMemo(() => {
    if (!statusInfo.progress) return 0;
    const { postsProcessed, totalPosts, commentsProcessed, totalComments } = statusInfo.progress;

    // Calculate based on step
    if (statusInfo.progress.step === "fetching_posts") {
      return 10; // 10% for initial fetch
    } else if (statusInfo.progress.step === "processing_posts") {
      const postProgress = totalPosts > 0 ? (postsProcessed / totalPosts) * 70 : 0; // 70% for posts
      return 10 + postProgress;
    } else if (statusInfo.progress.step === "processing_comments") {
      const postProgress = totalPosts > 0 ? (postsProcessed / totalPosts) * 70 : 0;
      const commentProgress = totalComments > 0 ? (commentsProcessed / totalComments) * 20 : 0; // 20% for comments
      return 10 + postProgress + commentProgress;
    }

    return 0;
  }, [statusInfo.progress]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  };

  const statusStyles: Record<IngestionStatusSnapshot["status"], string> = {
    idle: "bg-gray-800 text-gray-200",
    running: "bg-blue-900 text-blue-200",
    succeeded: "bg-green-900 text-green-200",
    failed: "bg-red-900 text-red-200",
  };

  const getStepDescription = (step: string) => {
    switch (step) {
      case "fetching_posts":
        return "Fetching posts from Reddit...";
      case "processing_posts":
        return "Processing posts...";
      case "processing_comments":
        return "Fetching and processing comments...";
      default:
        return "Processing...";
    }
  };

  // Don't render if idle and no progress, UNLESS we are starting
  if (!isStarting && statusInfo.status === "idle" && !statusInfo.progress) {
    return null;
  }

  // Use "STARTING" status if we are starting but backend still says idle
  const displayStatus = isStarting && statusInfo.status === "idle" ? "running" : statusInfo.status;

  return (
    <div className="mb-6 rounded-md border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[displayStatus] || statusStyles.running}`}
          >
            {isStarting && statusInfo.status === "idle" ? "STARTING" : statusInfo.status.toUpperCase()}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Reddit Ingestion
          </span>
        </div>
      </div>

      {statusInfo.progress && (
        <div className="mt-3">
          <div className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {getStepDescription(statusInfo.progress.step)}
          </div>
          <div className="mb-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%`, backgroundColor: 'var(--neon-cyan)' }}
            />
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {statusInfo.progress.postsProcessed}/{statusInfo.progress.totalPosts} posts • {statusInfo.progress.commentsProcessed} comments
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <div style={{ color: 'var(--text-secondary)' }}>Duration</div>
          <div style={{ color: 'var(--text-primary)' }}>{formatDuration(statusInfo.durationMs)}</div>
        </div>
        {statusInfo.error && (
          <div className="md:col-span-2 text-sm" style={{ color: 'var(--neon-pink)' }}>
            Error: {statusInfo.error}
          </div>
        )}
      </div>
    </div>
  );
}

