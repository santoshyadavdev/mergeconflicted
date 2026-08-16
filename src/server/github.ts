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

export async function fetchGitHubStats(
  username: string,
  fetchFn: typeof fetch = fetch,
): Promise<GitHubFetchResult> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mergeconflicted-app',
  };

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
  const eventsData = eventsRes.ok
    ? ((await eventsRes.json()) as Array<{
        type: string;
        created_at: string;
        payload: {
          review?: { state: string; body: string };
          comment?: { body: string };
        };
      }>)
    : [];

  // Fetch total PRs reviewed via search
  const searchRes = await fetchFn(
    `${GITHUB_API}/search/issues?q=reviewed-by:${encodeURIComponent(username)}+type:pr&per_page=1`,
    { headers },
  );
  const searchData = searchRes.ok ? ((await searchRes.json()) as { total_count: number }) : { total_count: 0 };

  // Aggregate stats
  let approvedCount = 0;
  let changesRequestedCount = 0;
  let commentOnlyCount = 0;
  let reviewCommentCount = 0;
  const commentBodies: string[] = [];
  const reviewDays: Record<string, number> = {};

  for (const event of eventsData) {
    if (event.type === 'PullRequestReviewEvent' && event.payload.review) {
      const state = event.payload.review.state;
      if (state === 'approved') approvedCount++;
      else if (state === 'changes_requested') changesRequestedCount++;
      else if (state === 'commented') commentOnlyCount++;

      if (event.payload.review.body) {
        commentBodies.push(event.payload.review.body);
      }

      const day = DAY_NAMES[new Date(event.created_at).getUTCDay()];
      reviewDays[day] = (reviewDays[day] ?? 0) + 1;
    } else if (event.type === 'PullRequestReviewCommentEvent' && event.payload.comment) {
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
