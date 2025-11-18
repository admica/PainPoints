import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  fetchSubredditPosts,
  fetchPostComments,
  normalizeRedditPost,
  normalizeRedditComment,
  type RedditTimeRange,
} from "@/lib/reddit";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const flow = await prisma.flow.findUnique({ where: { id } });
    if (!flow) {
      return NextResponse.json({ error: "flow not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const type = (body?.type ?? "paste") as "paste" | "reddit";

    if (type === "paste") {
      const text = (body?.text ?? "").toString().trim();
      if (!text) {
        return NextResponse.json({ error: "text is required for paste" }, { status: 400 });
      }
      const source = await prisma.flowSource.create({
        data: {
          flowId: flow.id,
          type: "paste",
          params: {},
        },
      });
      // Simple heuristic: split by two newlines as separate items, otherwise one item
      const chunks = splitIntoItems(text);
      const created = await prisma.$transaction(
        chunks.map((chunk) =>
          prisma.sourceItem.create({
            data: {
              flowId: flow.id,
              sourceId: source.id,
              text: chunk,
            },
          }),
        ),
      );
      return NextResponse.json({ source, items: created }, { status: 201 });
    }

    if (type === "reddit") {
      const subreddit = (body?.subreddit ?? "").toString().trim().toLowerCase().replace(/^r\//, "");
      const timeRange = (body?.timeRange ?? "week") as RedditTimeRange;
      const limit = Math.min(Math.max(Number(body?.limit ?? 100), 1), 500); // Clamp between 1-500
      const includeComments = body?.includeComments !== false; // Default true

      if (!subreddit) {
        return NextResponse.json({ error: "subreddit is required for reddit ingestion" }, { status: 400 });
      }

      // Check if ingestion is already running
      if (flow.ingestionStatus === "running") {
        return NextResponse.json(
          { error: "ingestion_running", message: "Ingestion already running for this flow." },
          { status: 409 },
        );
      }

      const ingestionStart = Date.now();

      // Set ingestion status to running
      await prisma.flow.update({
        where: { id: flow.id },
        data: {
          ingestionStatus: "running",
          ingestionProgress: {
            step: "fetching_posts",
            postsFound: 0,
            postsProcessed: 0,
            commentsProcessed: 0,
            totalPosts: 0,
            totalComments: 0,
          } as Prisma.JsonObject,
          ingestionError: null,
        },
      });

      try {
        // Fetch posts from Reddit FIRST (before creating FlowSource to avoid orphaned records)
        console.log(`Fetching posts from r/${subreddit}...`);
        const posts = await fetchSubredditPosts(subreddit, timeRange, limit);

        if (posts.length === 0) {
          await finalizeIngestion(flow.id, "failed", `No posts found in r/${subreddit} for the selected time range`, ingestionStart);
          return NextResponse.json(
            { error: `No posts found in r/${subreddit} for the selected time range` },
            { status: 404 },
          );
        }

        // Update progress with posts found
        await updateIngestionProgress(flow.id, {
          step: "processing_posts",
          postsFound: posts.length,
          postsProcessed: 0,
          commentsProcessed: 0,
          totalPosts: posts.length,
          totalComments: 0,
        });

        // Create FlowSource AFTER successful fetch to ensure data integrity
        const source = await prisma.flowSource.create({
          data: {
            flowId: flow.id,
            type: "reddit",
            params: {
              subreddit,
              timeRange,
              limit,
              includeComments,
            },
          },
        });

        const createdItems = [];

        // Calculate estimated time for user feedback
        const estimatedRequests = includeComments ? posts.length + 1 : 1; // +1 for initial post fetch
        const estimatedSeconds = Math.ceil(estimatedRequests * 1.1); // 1.1s per request
        console.log(`Reddit fetch: ${posts.length} posts, ${includeComments ? 'with' : 'without'} comments. Estimated time: ~${estimatedSeconds}s`);

        // Process posts with rate limiting
        // Note: Rate limiting is now handled in fetchWithRateLimit() in reddit.ts
        // which adds 1.1s delay before each request automatically
        let postsProcessed = 0;
        let commentsProcessed = 0;

        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          console.log(`Processing post ${i + 1}/${posts.length}: ${post.title.substring(0, 50)}...`);

          const normalized = normalizeRedditPost(post);

          // Create SourceItem for the post
          const postItem = await prisma.sourceItem.create({
            data: {
              flowId: flow.id,
              sourceId: source.id,
              title: normalized.title,
              text: normalized.text,
              redditId: normalized.redditId,
              authorHash: normalized.authorHash,
              score: normalized.score,
              numComments: normalized.numComments,
              url: normalized.url,
              itemCreatedAt: normalized.itemCreatedAt,
            },
          });
          createdItems.push(postItem);
          postsProcessed++;

          // Update progress
          await updateIngestionProgress(flow.id, {
            step: "processing_posts",
            postsFound: posts.length,
            postsProcessed,
            commentsProcessed,
            totalPosts: posts.length,
            totalComments: 0, // Will be updated after comments are fetched
          });

          // Fetch comments if requested
          // Rate limiting is handled automatically in fetchPostComments -> fetchWithRateLimit
          if (includeComments && post.numComments > 0) {
            try {
              console.log(`Fetching comments for post ${post.id}...`);
              const comments = await fetchPostComments(post.id, post.subreddit, 10); // Top 10 comments per post

              // Update progress with comments found for this post
              await updateIngestionProgress(flow.id, {
                step: "processing_comments",
                postsFound: posts.length,
                postsProcessed,
                commentsProcessed,
                totalPosts: posts.length,
                totalComments: commentsProcessed + comments.length,
              });

              // Create SourceItems for comments
              for (const comment of comments) {
                const normalizedComment = normalizeRedditComment(comment, post.title);
                const commentItem = await prisma.sourceItem.create({
                  data: {
                    flowId: flow.id,
                    sourceId: source.id,
                    title: normalizedComment.title,
                    text: normalizedComment.text,
                    redditId: normalizedComment.redditId,
                    authorHash: normalizedComment.authorHash,
                    score: normalizedComment.score,
                    numComments: normalizedComment.numComments,
                    url: normalizedComment.url,
                    itemCreatedAt: normalizedComment.itemCreatedAt,
                  },
                });
                createdItems.push(commentItem);
                commentsProcessed++;
              }

              // Update progress after processing comments for this post
              await updateIngestionProgress(flow.id, {
                step: "processing_comments",
                postsFound: posts.length,
                postsProcessed,
                commentsProcessed,
                totalPosts: posts.length,
                totalComments: commentsProcessed,
              });

            } catch (commentError: any) {
              // Log but don't fail - continue with other posts
              // Rate limit errors are handled in fetchWithRateLimit with retries
              console.error(`Failed to fetch comments for post ${post.id}:`, commentError);
            }
          }
        }

        // Finalize successful ingestion
        await finalizeIngestion(flow.id, "succeeded", null, ingestionStart);

        return NextResponse.json(
          {
            source,
            items: createdItems,
            stats: {
              posts: posts.length,
              comments: includeComments ? createdItems.length - posts.length : 0,
              total: createdItems.length,
            },
          },
          { status: 201 },
        );
      } catch (error: any) {
        console.error("Reddit ingestion error:", error);

        // Provide more specific error messages for common issues
        let errorMessage = error.message || "Failed to fetch data from Reddit";
        let statusCode = 500;

        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          errorMessage = `Subreddit "r/${subreddit}" not found or is private.`;
          statusCode = 404;
        } else if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
          errorMessage = `Access forbidden to subreddit "r/${subreddit}".`;
          statusCode = 403;
        } else if (errorMessage.includes("rate limit")) {
          errorMessage = "Reddit API rate limit exceeded. Please wait a few minutes and try again.";
          statusCode = 429;
        }

        await finalizeIngestion(flow.id, "failed", errorMessage, ingestionStart);

        return NextResponse.json(
          {
            error: "reddit_error",
            message: errorMessage,
          },
          { status: statusCode },
        );
      }
    }

    return NextResponse.json({ error: "invalid type. Use 'paste' or 'reddit'" }, { status: 400 });
  } catch (e: any) {
    console.error("Error ingesting data:", e);
    return NextResponse.json(
      { error: "db_error", message: String(e?.message || e) },
      { status: 500 },
    );
  }
}

function splitIntoItems(text: string): string[] {
  const blocks = text
    .split(/\n{2,}/g)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.length ? blocks : [text];
}

async function updateIngestionProgress(flowId: string, progress: {
  step: string;
  postsFound: number;
  postsProcessed: number;
  commentsProcessed: number;
  totalPosts: number;
  totalComments: number;
}) {
  await prisma.flow.update({
    where: { id: flowId },
    data: {
      ingestionProgress: progress as Prisma.JsonObject,
    },
  });
}

async function finalizeIngestion(flowId: string, status: "succeeded" | "failed", errorMessage: string | null, startTime: number) {
  const duration = Date.now() - startTime;
  await prisma.flow.update({
    where: { id: flowId },
    data: {
      ingestionStatus: status,
      ingestionProgress: Prisma.JsonNull,
      ingestionError: errorMessage,
      ingestionDurationMs: duration,
    },
  });
}


