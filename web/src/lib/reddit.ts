export type RedditTimeRange = "hour" | "day" | "week" | "month" | "year" | "all";

export interface RedditPost {
  id: string;
  title: string;
  text: string;
  author: string;
  score: number;
  numComments: number;
  url: string;
  createdUtc: number;
  permalink: string;
  subreddit: string;
}

export interface RedditComment {
  id: string;
  text: string;
  author: string;
  score: number;
  createdUtc: number;
  permalink: string;
  parentId: string; // Post ID this comment belongs to
}

/**
 * Rate limiter: Reddit allows 60 requests/min unauthenticated
 * We use 1.033 seconds between requests = ~58 requests/min (safe margin)
 */
const REDDIT_RATE_LIMIT_DELAY_MS = 1033; // 1.033 seconds = 58 requests/min

/**
 * Fetch with rate limiting and retry logic
 */
async function fetchWithRateLimit(
  url: string,
  retryCount: number = 0,
  maxRetries: number = 3,
): Promise<Response> {
  // Rate limit: wait before each request
  await sleep(REDDIT_RATE_LIMIT_DELAY_MS);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'PainPoints/1.0 (by /u/painpoints)',
    },
  });

  // Handle rate limiting (429 Too Many Requests)
  if (response.status === 429) {
    if (retryCount >= maxRetries) {
      throw new Error('Reddit API rate limit exceeded. Please wait a few minutes and try again.');
    }

    // Get retry-after header (seconds) or use exponential backoff
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter 
      ? parseInt(retryAfter) * 1000 
      : Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s

    console.warn(`Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`);
    await sleep(waitTime);
    
    return fetchWithRateLimit(url, retryCount + 1, maxRetries);
  }

  return response;
}

/**
 * Fetch posts from a subreddit using Reddit's public JSON API
 */
export async function fetchSubredditPosts(
  subreddit: string,
  timeRange: RedditTimeRange = "week",
  limit: number = 100,
): Promise<RedditPost[]> {
  // Map time range to Reddit's time filter
  const timeFilterMap: Record<RedditTimeRange, string> = {
    hour: "hour",
    day: "day",
    week: "week",
    month: "month",
    year: "year",
    all: "all",
  };

    try {
      let url: string;
      
      // Use appropriate endpoint based on time range
      if (timeRange === "all") {
        // For "all time", use hot posts
        url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${Math.min(limit, 100)}`;
      } else {
        // For time-based, use top posts
        url = `https://www.reddit.com/r/${subreddit}/top.json?t=${timeFilterMap[timeRange]}&limit=${Math.min(limit, 100)}`;
      }

      const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Subreddit "${subreddit}" not found or is private`);
      }
      if (response.status === 403) {
        throw new Error(`Access forbidden to subreddit "${subreddit}"`);
      }
      if (response.status === 429) {
        throw new Error("Reddit API rate limit exceeded. Please wait a few minutes and try again.");
      }
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data.children)) {
      throw new Error(`Invalid response from Reddit API`);
    }

    return data.data.children.map((child: any) => {
      const post = child.data;
      return {
        id: post.id,
        title: post.title,
        text: post.selftext || "", // selftext is the post body for text posts
        author: post.author || "[deleted]",
        score: post.score || 0,
        numComments: post.num_comments || 0,
        url: post.url,
        createdUtc: post.created_utc,
        permalink: post.permalink,
        subreddit: post.subreddit || subreddit,
      };
    });
  } catch (error: any) {
    if (error.message?.includes("not found") || error.message?.includes("404")) {
      throw new Error(`Subreddit "${subreddit}" not found or is private`);
    }
    if (error.message?.includes("Forbidden") || error.message?.includes("403")) {
      throw new Error(`Access forbidden to subreddit "${subreddit}"`);
    }
    if (error.message?.includes("429") || error.message?.includes("rate limit")) {
      throw new Error("Reddit API rate limit exceeded. Please wait a few minutes and try again.");
    }
    throw new Error(`Failed to fetch posts from r/${subreddit}: ${error.message}`);
  }
}

/**
 * Fetch top comments for a post using Reddit's public JSON API
 */
export async function fetchPostComments(
  postId: string,
  subreddit: string,
  limit: number = 10,
): Promise<RedditComment[]> {
  try {
    // Reddit's JSON API for comments: /r/subreddit/comments/{postId}.json
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=${limit}`;
    
    const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      console.error(`Failed to fetch comments for post ${postId}: ${response.status}`);
      return []; // Return empty array instead of throwing
    }

    const data = await response.json();
    
    // Reddit returns an array: [post data, comments data]
    if (!Array.isArray(data) || data.length < 2) {
      return [];
    }

    const commentsData = data[1];
    if (!commentsData?.data?.children) {
      return [];
    }

    const comments: RedditComment[] = [];

    // Recursively extract comments
    const extractComments = (commentList: any[], parentId: string) => {
      if (!commentList || !Array.isArray(commentList)) return;
      
      for (const child of commentList) {
        const comment = child.data;
        
        // Skip "more" objects and deleted comments
        if (!comment || comment.kind !== 't1' || !comment.body || comment.body === "[deleted]" || comment.body === "[removed]") {
          continue;
        }

        comments.push({
          id: comment.id,
          text: comment.body,
          author: comment.author || "[deleted]",
          score: comment.score || 0,
          createdUtc: comment.created_utc,
          permalink: comment.permalink,
          parentId,
        });

        // Recursively get replies (but limit depth to avoid too many)
        if (comment.replies && comment.replies.data && comment.replies.data.children && comments.length < limit * 2) {
          extractComments(comment.replies.data.children, comment.id);
        }
      }
    };

    extractComments(commentsData.data.children, postId);

    // Sort by score and limit to top comments
    return comments
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((c) => ({ ...c, parentId: postId })); // Ensure all comments reference the post
  } catch (error: any) {
    console.error(`Error fetching comments for post ${postId}:`, error);
    // Don't throw - just return empty array if comments fail
    return [];
  }
}

/**
 * Normalize Reddit post data for storage
 */
export function normalizeRedditPost(post: RedditPost): {
  title: string;
  text: string;
  redditId: string;
  authorHash: string;
  score: number;
  numComments: number;
  url: string;
  itemCreatedAt: Date;
} {
  return {
    title: post.title,
    text: post.text || post.title, // Use title if no selftext
    redditId: post.id,
    authorHash: post.author, // Store author name (could hash for privacy)
    score: post.score,
    numComments: post.numComments,
    url: `https://reddit.com${post.permalink}`,
    itemCreatedAt: new Date(post.createdUtc * 1000), // Convert Unix timestamp
  };
}

/**
 * Normalize Reddit comment data for storage
 */
export function normalizeRedditComment(comment: RedditComment, postTitle: string): {
  title: string | null;
  text: string;
  redditId: string;
  authorHash: string;
  score: number;
  numComments: number | null;
  url: string;
  itemCreatedAt: Date;
} {
  return {
    title: `Comment on: ${postTitle.substring(0, 50)}${postTitle.length > 50 ? "..." : ""}`,
    text: comment.text,
    redditId: comment.id,
    authorHash: comment.author,
    score: comment.score,
    numComments: null, // Comments don't have comment counts
    url: `https://reddit.com${comment.permalink}`,
    itemCreatedAt: new Date(comment.createdUtc * 1000),
  };
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
