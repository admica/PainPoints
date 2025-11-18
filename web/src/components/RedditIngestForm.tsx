"use client";

import React, { useState } from "react";
import { audioManager } from "@/lib/audioManager";

export function RedditIngestForm({ flowId }: { flowId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    audioManager.playClick();

    const formData = new FormData(e.currentTarget);
    const subreddit = String(formData.get("subreddit") ?? "").trim().toLowerCase().replace(/^r\//, "");
    const timeRange = String(formData.get("timeRange") ?? "week");
    const limit = Number(formData.get("limit") ?? 100);
    const includeComments = formData.get("includeComments") === "on";

    if (!subreddit) {
      setMessage({ type: 'error', text: 'Please enter a subreddit name.' });
      return;
    }

    // Smart limits based on time range to prevent rate limiting
    // Longer time ranges = more posts available = higher risk of rate limits
    const maxLimits: Record<string, number> = {
      hour: 100,   // Hour: can fetch more (fewer posts available)
      day: 100,    // Day: can fetch more
      week: 100,   // Week: moderate limit
      month: 100,   // Month: lower limit (many posts available)
      year: 50,    // Year: very low limit
      all: 25,     // All time: very low limit
    };

    const maxLimit = maxLimits[timeRange] || 100;
    if (limit < 1 || limit > maxLimit) {
      setMessage({ 
        type: 'error', 
        text: `Post limit must be between 1 and ${maxLimit} for ${timeRange} time range. Larger ranges have lower limits to prevent rate limiting.` 
      });
      return;
    }

    // Calculate estimated time and warn user for large requests
    // Rate limit: 1.1s per request, so 100 posts + 100 comments = ~220 seconds (~3.7 minutes)
    const estimatedRequests = includeComments ? limit + 1 : 1; // +1 for initial post fetch
    const estimatedSeconds = Math.ceil(estimatedRequests * 1.1);
    const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

    // Warn for requests that will take >30 seconds
    if (estimatedSeconds > 30) {
      const proceed = confirm(
        `This will fetch ${limit} posts${includeComments ? ' with comments' : ''} from r/${subreddit}.\n\n` +
        `Estimated time: ~${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''} (${estimatedSeconds} seconds).\n\n` +
        `This is a large request. Continue?`
      );
      if (!proceed) {
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);

    // Dispatch ingestion started event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ingestion-started", { detail: { flowId } }));
    }

    try {
      const res = await fetch(`/api/flows/${flowId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reddit",
          subreddit,
          timeRange,
          limit,
          includeComments,
        }),
      });

      if (!res.ok) {
        let errorData: any;
        try {
          errorData = await res.json();
        } catch {
          const errorText = await res.text();
          errorData = { error: errorText };
        }
        throw new Error(errorData.message || errorData.error || `API error: ${res.statusText}`);
      }

      const result = await res.json();

      // Clear the form
      (e.target as HTMLFormElement).reset();

      // Prioritize items array length over stats for accuracy
      const itemCount = result.items?.length ?? result.stats?.total ?? 0;
      const postsCount = result.stats?.posts ?? 0;
      const commentsCount = result.stats?.comments ?? 0;

      let successMessage = `Successfully fetched ${itemCount} item${itemCount !== 1 ? 's' : ''} from r/${subreddit}`;
      if (includeComments && commentsCount > 0) {
        successMessage += ` (${postsCount} posts, ${commentsCount} comments)`;
      } else if (postsCount > 0) {
        successMessage += ` (${postsCount} posts)`;
      }

      setMessage({
        type: 'success',
        text: successMessage,
      });

      audioManager.playTaskComplete();

      // Dispatch ingestion finished event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ingestion-finished", { detail: { flowId } }));
      }

      // Trigger page refresh after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Reddit ingest error:", error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to fetch data from Reddit. Please try again.'
      });

      // Dispatch ingestion finished event on error
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ingestion-finished", { detail: { flowId } }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="subreddit" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Subreddit
        </label>
        <input
          id="subreddit"
          name="subreddit"
          type="text"
          placeholder="webdev"
          className="w-full rounded-md border p-2 outline-none transition-all"
          style={{ 
            backgroundColor: 'var(--bg-elevated)', 
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--neon-cyan)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 255, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="timeRange" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Time Range
        </label>
        <select
          id="timeRange"
          name="timeRange"
          className="w-full rounded-md border p-2 outline-none transition-all"
          style={{ 
            backgroundColor: 'var(--bg-elevated)', 
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--neon-cyan)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 255, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          disabled={isSubmitting}
          defaultValue="week"
        >
          <option value="hour">Past Hour</option>
          <option value="day">Past Day</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
          <option value="year">Past Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="limit" className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Post Limit
        </label>
        <input
          id="limit"
          name="limit"
          type="number"
          min="1"
          max="500"
          defaultValue="100"
          className="w-full rounded-md border p-2 outline-none transition-all"
          style={{ 
            backgroundColor: 'var(--bg-elevated)', 
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--neon-cyan)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 255, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="includeComments"
          name="includeComments"
          type="checkbox"
          defaultChecked
          className="rounded"
          style={{ 
            accentColor: 'var(--neon-cyan)'
          }}
          disabled={isSubmitting}
        />
        <label htmlFor="includeComments" className="text-sm" style={{ color: 'var(--text-primary)' }}>
          Include comments (top 10 per post)
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-md px-4 py-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style={{ backgroundColor: 'var(--neon-cyan)', color: 'var(--bg-primary)' }}
        onMouseEnter={(e) => {
          if (!isSubmitting) {
            audioManager.playHover();
            e.currentTarget.style.boxShadow = '0 0 4px var(--glow-cyan), 0 0 8px var(--glow-cyan)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isSubmitting && (
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }}></div>
        )}
        {isSubmitting ? 'Fetching posts...' : 'Fetch from Reddit'}
      </button>

      {message && (
        <div className="p-3 rounded-md text-sm border"
        style={{
          borderColor: message.type === 'success' 
            ? 'var(--neon-green)' 
            : 'var(--neon-pink)',
          backgroundColor: message.type === 'success' 
            ? 'rgba(0, 255, 136, 0.1)' 
            : 'rgba(255, 0, 128, 0.1)',
          color: message.type === 'success' 
            ? 'var(--neon-green)' 
            : 'var(--neon-pink)'
        }}>
          {message.text}
        </div>
      )}
    </form>
  );
}

