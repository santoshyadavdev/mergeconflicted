import { GitHubUserProfile } from '../app/models/reviewer.model';

export interface GitHubAggregatedStats {
  totalPRsReviewed: number;
  approvedCount: number;
  changesRequestedCount: number;
  commentOnlyCount: number;
  reviewCommentCount: number;
  totalReviewEvents: number;
  avgCommentLength: number;
  reviewDays: Record<string, number>;
  commentBodies: string[];
}

export interface GitHubFetchResult {
  profile: GitHubUserProfile;
  stats: GitHubAggregatedStats;
}

const GITHUB_API = 'https://api.github.com';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_PRS_INSPECTED = 20;
const REVIEW_FETCH_CONCURRENCY = 5;

interface PullRequestReview {
  user: { login: string } | null;
  state: string;
  body: string | null;
  submitted_at: string | null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchGitHubStats(
  username: string,
  fetchFn: typeof fetch = fetch,
  githubToken?: string,
): Promise<GitHubFetchResult> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mergeconflicted-app',
  };
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  // Fetch user profile
  const userRes = await fetchFn(`${GITHUB_API}/users/${encodeURIComponent(username)}`, { headers });
  if (userRes.status === 404) {
    throw new Error('User not found');
  }
  if (!userRes.ok) {
    throw new Error(`GitHub API error: ${userRes.status}`);
  }
  const userData = (await userRes.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
    bio: string | null;
    public_repos: number;
  };

  // Fetch public events
  const eventsRes = await fetchFn(
    `${GITHUB_API}/users/${encodeURIComponent(username)}/events/public?per_page=100`,
    { headers },
  );
  if (eventsRes.status === 403 || eventsRes.status === 429) {
    throw new Error(`GitHub rate limit exceeded (${eventsRes.status})`);
  }
  if (!eventsRes.ok) {
    throw new Error(`GitHub events API error: ${eventsRes.status}`);
  }
  const eventsData = (await eventsRes.json()) as Array<{
    type: string;
    payload: {
      comment?: { body: string };
    };
  }>;

  // Fetch PRs reviewed by the user via search
  const searchRes = await fetchFn(
    `${GITHUB_API}/search/issues?q=reviewed-by:${encodeURIComponent(username)}+type:pr&sort=updated&order=desc&per_page=${MAX_PRS_INSPECTED}`,
    { headers },
  );
  if (searchRes.status === 403 || searchRes.status === 429) {
    throw new Error(`GitHub rate limit exceeded (${searchRes.status})`);
  }
  if (!searchRes.ok) {
    throw new Error(`GitHub search API error: ${searchRes.status}`);
  }
  const searchData = (await searchRes.json()) as {
    total_count: number;
    items?: Array<{ repository_url: string; number: number }>;
  };

  // Review states are only reliably available from the reviews API — the public
  // events feed is capped at ~90 days and rarely contains PullRequestReviewEvent.
  const reviewPages = await mapWithConcurrency(
    searchData.items ?? [],
    REVIEW_FETCH_CONCURRENCY,
    async (item) => {
      const repoPath = item.repository_url.replace(`${GITHUB_API}/repos/`, '');
      try {
        const res = await fetchFn(`${GITHUB_API}/repos/${repoPath}/pulls/${item.number}/reviews?per_page=100`, {
          headers,
        });
        if (!res.ok) return [];
        return (await res.json()) as PullRequestReview[];
      } catch {
        return [];
      }
    },
  );

  // Aggregate stats
  let approvedCount = 0;
  let changesRequestedCount = 0;
  let commentOnlyCount = 0;
  let reviewCommentCount = 0;
  const commentBodies: string[] = [];
  const reviewDays: Record<string, number> = {};
  const lowerUsername = username.toLowerCase();

  for (const reviews of reviewPages) {
    for (const review of reviews) {
      if (review.user?.login.toLowerCase() !== lowerUsername) continue;

      const state = review.state.toLowerCase();
      if (state === 'approved') approvedCount++;
      else if (state === 'changes_requested') changesRequestedCount++;
      else if (state === 'commented') commentOnlyCount++;
      else continue;

      if (review.body) {
        commentBodies.push(review.body);
      }
      if (review.submitted_at) {
        const day = DAY_NAMES[new Date(review.submitted_at).getUTCDay()];
        reviewDays[day] = (reviewDays[day] ?? 0) + 1;
      }
    }
  }

  // Public events supply inline review comments, which the reviews API does not return
  for (const event of eventsData) {
    if (event.type === 'PullRequestReviewCommentEvent' && event.payload.comment) {
      reviewCommentCount++;
      if (event.payload.comment.body) {
        commentBodies.push(event.payload.comment.body);
      }
    }
  }

  const totalCommentLength = commentBodies.reduce((sum, body) => sum + body.length, 0);
  const avgCommentLength = commentBodies.length > 0 ? Math.round(totalCommentLength / commentBodies.length) : 0;

  return {
    profile: {
      login: userData.login,
      name: userData.name,
      avatarUrl: userData.avatar_url,
      bio: userData.bio,
      publicRepos: userData.public_repos,
    },
    stats: {
      totalPRsReviewed: searchData.total_count,
      approvedCount,
      changesRequestedCount,
      commentOnlyCount,
      reviewCommentCount,
      totalReviewEvents: approvedCount + changesRequestedCount + commentOnlyCount,
      avgCommentLength,
      reviewDays,
      commentBodies,
    },
  };
}
