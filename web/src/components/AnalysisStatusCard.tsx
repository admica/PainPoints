"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";

export type AnalysisProgress = {
  batch: number;
  totalBatches: number;
  itemsProcessed: number;
  totalItems: number;
  currentActivity?: string;
  logs?: string[];
};

export type AnalysisRunHistory = {
  id: string;
  status: AnalysisStatusSnapshot["status"];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  itemsAnalyzed: number | null;
  batchesProcessed: number | null;
  errorMessage: string | null;
};

export type AnalysisStatusSnapshot = {
  status: "idle" | "running" | "succeeded" | "failed" | "canceled";
  progress: AnalysisProgress | null;
  error: string | null;
  lastAnalyzedAt: string | null;
  analysisDurationMs: number | null;
  newDataAvailable: boolean;
  itemsCount: number;
  history: AnalysisRunHistory[];
};

type Props = {
  flowId: string;
  initial: AnalysisStatusSnapshot;
};

export function AnalysisStatusCard({ flowId, initial }: Props) {
  const [statusInfo, setStatusInfo] = useState(initial);
  const [isCancelling, setIsCancelling] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/flows/${flowId}/analysis-status`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setStatusInfo({
        status: data.status,
        progress: data.progress,
        error: data.error ?? null,
        lastAnalyzedAt: data.lastAnalyzedAt ?? null,
        analysisDurationMs: data.analysisDurationMs ?? null,
        newDataAvailable: data.newDataAvailable ?? false,
        itemsCount: data.itemsCount ?? statusInfo.itemsCount,
        history: data.history ?? [],
      });
      setFetchError(null);

      // If we were starting and now we see running, we can stop the "starting" override
      // but we keep polling because isRunning will be true.
      // If we see succeeded/failed, we stop starting.
      if (data.status === "running") {
        setIsStarting(false);
      } else if (data.status !== "idle" && data.status !== "running") {
        setIsStarting(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh analysis status.";
      setFetchError(message);
    }
  }, [flowId, statusInfo.itemsCount]);

  const isRunning = statusInfo.status === "running" || isStarting;

  // Auto-expand when running
  useEffect(() => {
    if (isRunning) {
      setIsExpanded(true);
    }
  }, [isRunning]);

  // Auto-scroll logs container
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [statusInfo.progress?.logs]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 1000); // Faster polling for live feel
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
    window.addEventListener("analysis-started", handler as EventListener);
    window.addEventListener("analysis-finished", handler as EventListener);
    return () => {
      window.removeEventListener("analysis-started", handler as EventListener);
      window.removeEventListener("analysis-finished", handler as EventListener);
    };
  }, [flowId, fetchStatus]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/analyze/cancel`, { method: "POST" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await fetchStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel analysis.";
      setFetchError(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const progressPercent = useMemo(() => {
    if (!statusInfo.progress) return 0;
    if (!statusInfo.progress.totalBatches) return 0;
    return Math.min(
      100,
      Math.round((statusInfo.progress.batch / statusInfo.progress.totalBatches) * 100),
    );
  }, [statusInfo.progress]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return "—";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    const date = new Date(iso);
    return date.toLocaleString();
  };

  const statusStyles: Record<AnalysisStatusSnapshot["status"], string> = {
    idle: "bg-gray-800 text-gray-200",
    running: "bg-blue-900 text-blue-200 animate-pulse",
    succeeded: "bg-green-900 text-green-200",
    failed: "bg-red-900 text-red-200",
    canceled: "bg-yellow-900 text-yellow-200",
  };

  return (
    <div className="mb-6 rounded-md border transition-all duration-300" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-elevated)' }}>
      {/* Header / Summary Bar */}
      <div className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[statusInfo.status]}`}
          >
            {statusInfo.status.toUpperCase()}
          </span>
          {statusInfo.newDataAvailable && (
            <span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--neon-green)' }}>
              New data added
            </span>
          )}
          {isRunning && statusInfo.progress?.currentActivity && (
            <span className="text-sm font-mono hidden md:inline-block" style={{ color: 'var(--neon-cyan)' }}>
              {statusInfo.progress.currentActivity}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Items: <span style={{ color: 'var(--neon-green)' }}>{statusInfo.itemsCount}</span>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs hover:text-white transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isExpanded ? "Hide Details ▲" : "Show Details ▼"}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-color)' }}>

          {/* Progress Bar & Activity */}
          {statusInfo.progress && (
            <div className="mt-4">
              <div className="flex justify-between mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  Batch {statusInfo.progress.batch} / {statusInfo.progress.totalBatches}
                </span>
                <span>
                  {statusInfo.progress.itemsProcessed}/{statusInfo.progress.totalItems} items
                </span>
              </div>
              <div className="h-2 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%`, backgroundColor: 'var(--neon-cyan)' }}
                />
              </div>

              {/* Live Terminal Logs */}
              {statusInfo.progress.logs && statusInfo.progress.logs.length > 0 && (
                <div 
                  ref={logsContainerRef}
                  className="mb-4 rounded bg-black/50 p-3 font-mono text-xs border border-white/10 h-48 overflow-y-auto shadow-inner custom-scrollbar"
                >
                  {statusInfo.progress.logs.map((log, i) => (
                    <div key={i} className="mb-1 last:mb-0 text-gray-300">
                      <span className="text-gray-500 mr-2">{log.split(']')[0]}]</span>
                      <span className={log.includes("Error") ? "text-red-400" : "text-cyan-100"}>
                        {log.split(']').slice(1).join(']')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid gap-3 text-sm md:grid-cols-2 mt-4">
            <div>
              <div style={{ color: 'var(--text-secondary)' }}>Last analyzed</div>
              <div style={{ color: 'var(--text-primary)' }}>{formatDate(statusInfo.lastAnalyzedAt)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)' }}>Last duration</div>
              <div style={{ color: 'var(--text-primary)' }}>{formatDuration(statusInfo.analysisDurationMs)}</div>
            </div>
            {statusInfo.error && (
              <div className="md:col-span-2 text-sm" style={{ color: 'var(--neon-pink)' }}>
                Error: {statusInfo.error}
              </div>
            )}
            {fetchError && (
              <div className="md:col-span-2 text-sm" style={{ color: 'var(--neon-pink)' }}>
                {fetchError}
              </div>
            )}
          </div>

          {/* Actions */}
          {isRunning && (
            <div className="mt-4">
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="rounded-md border px-3 py-1.5 text-sm transition-all disabled:opacity-60 hover:bg-red-900/20"
                style={{ borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)' }}
              >
                {isCancelling ? "Canceling…" : "Cancel analysis"}
              </button>
            </div>
          )}

          {/* History */}
          {statusInfo.history.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Recent runs
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {statusInfo.history.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-md border px-3 py-2 text-xs hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--text-primary)' }}>
                        {new Date(run.startedAt).toLocaleString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${statusStyles[run.status]}`}>
                        {run.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <span>Duration: {formatDuration(run.durationMs)}</span>
                      {typeof run.itemsAnalyzed === "number" && (
                        <span>Items: {run.itemsAnalyzed}</span>
                      )}
                      {typeof run.batchesProcessed === "number" && (
                        <span>Batches: {run.batchesProcessed}</span>
                      )}
                    </div>
                    {run.errorMessage && (
                      <div className="mt-1" style={{ color: 'var(--neon-pink)' }}>
                        {run.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
