import { describe, it, expect, vi } from 'vitest';
import { fetchGitHubStats } from './github';

const mockUserResponse = {
  login: 'octocat',
  name: 'The Octocat',
  avatar_url: 'https://github.com/octocat.png',
  bio: 'GitHub mascot',
  public_repos: 8,
};

const mockEventsResponse = [
  {
    type: 'PullRequestReviewCommentEvent',
    created_at: '2026-08-12T09:00:00Z',
    payload: {
      comment: { body: 'Consider using optional chaining here.' },
    },
  },
];

const mockSearchResponse = {
  total_count: 42,
  items: [{ repository_url: 'https://api.github.com/repos/octo/repo', number: 7 }],
};

// The reviews API returns uppercase states, unlike the events feed
const mockReviewsResponse = [
  { user: { login: 'octocat' }, state: 'APPROVED', body: 'LGTM', submitted_at: '2026-08-10T10:00:00Z' },
  {
    user: { login: 'octocat' },
    state: 'CHANGES_REQUESTED',
    body: 'Please fix the null check on line 42.',
    submitted_at: '2026-08-11T14:00:00Z',
  },
  { user: { login: 'someone-else' }, state: 'APPROVED', body: 'ship it', submitted_at: '2026-08-11T15:00:00Z' },
];

describe('fetchGitHubStats', () => {
  it('should aggregate GitHub data into stats', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSearchResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockReviewsResponse)));

    const result = await fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch);

    expect(result.profile.login).toBe('octocat');
    expect(result.profile.avatarUrl).toBe('https://github.com/octocat.png');
    expect(result.stats.totalPRsReviewed).toBe(42);
    expect(result.stats.approvedCount).toBe(1);
    expect(result.stats.changesRequestedCount).toBe(1);
    expect(result.stats.commentOnlyCount).toBe(0);
    expect(result.stats.reviewCommentCount).toBe(1);
    expect(result.stats.totalReviewEvents).toBe(2);
    expect(result.stats.reviewDays).toEqual({ Monday: 1, Tuesday: 1 });
  });

  it('should skip PRs whose reviews cannot be fetched', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSearchResponse)))
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    const result = await fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch);

    expect(result.stats.totalReviewEvents).toBe(0);
    expect(result.stats.totalPRsReviewed).toBe(42);
  });

  it('should count body-less reviews as zero-length in the average', async () => {
    const silentReviews = [
      { user: { login: 'octocat' }, state: 'APPROVED', body: '', submitted_at: '2026-08-10T10:00:00Z' },
      { user: { login: 'octocat' }, state: 'APPROVED', body: null, submitted_at: '2026-08-10T11:00:00Z' },
      { user: { login: 'octocat' }, state: 'COMMENTED', body: 'x'.repeat(400), submitted_at: '2026-08-10T12:00:00Z' },
    ];
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSearchResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(silentReviews)));

    const result = await fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch);

    // 400 chars over 3 reviews, not over the 1 that had a body
    expect(result.stats.avgCommentLength).toBe(133);
  });

  it('should throw on 404', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response('Not Found', { status: 404 }));

    await expect(fetchGitHubStats('nonexistent', mockFetch as unknown as typeof fetch)).rejects.toThrow('User not found');
  });

  it('should throw on rate limit (403) for events', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));

    await expect(fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch)).rejects.toThrow('GitHub rate limit exceeded (403)');
  });

  it('should throw on rate limit (429) for search', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }));

    await expect(fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch)).rejects.toThrow('GitHub rate limit exceeded (429)');
  });

  it('should include Authorization header when token provided', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockUserResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockEventsResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockSearchResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockReviewsResponse)));

    await fetchGitHubStats('octocat', mockFetch as unknown as typeof fetch, 'ghp_test123');

    const firstCallHeaders = mockFetch.mock.calls[0][1].headers;
    expect(firstCallHeaders['Authorization']).toBe('Bearer ghp_test123');
  });
});
