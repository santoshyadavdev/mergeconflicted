import { describe, it, expect, vi } from 'vitest';
import { generatePersonality } from './gemini';
import { GitHubAggregatedStats } from './github';

const mockStats: GitHubAggregatedStats = {
  totalPRsReviewed: 42,
  approvedCount: 10,
  changesRequestedCount: 25,
  commentOnlyCount: 7,
  reviewCommentCount: 30,
  totalReviewEvents: 42,
  avgCommentLength: 280,
  reviewDays: { Tuesday: 15, Wednesday: 10, Monday: 8 },
  commentBodies: ['Fix this null check', 'Consider using optional chaining'],
};

const mockGeminiResponse = {
  archetype: 'The Nitpicker',
  emoji: '🔍',
  tagline: 'No detail escapes my review',
  description: 'You examine every line with surgical precision.',
  strengths: ['Thorough analysis', 'Catches edge cases', 'Consistent standards'],
  funFacts: ['Reviews most on Tuesdays', 'Favorite word: "nit"'],
  reviewStyle: 'Meticulous and detail-oriented',
  stats: {
    reviewsAnalyzed: 42,
    approvalRate: '24%',
    avgCommentLength: 280,
    mostActiveDay: 'Tuesday',
  },
};

describe('generatePersonality', () => {
  it('should call Gemini and return parsed personality', async () => {
    const mockGenAI = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify(mockGeminiResponse),
        }),
      },
    };

    const result = await generatePersonality('octocat', mockStats, mockGenAI as never);

    expect(result.archetype).toBe('The Nitpicker');
    expect(result.emoji).toBe('🔍');
    expect(result.tagline).toBe('No detail escapes my review');
    expect(result.strengths).toHaveLength(3);
    expect(mockGenAI.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('should throw on invalid JSON from Gemini', async () => {
    const mockGenAI = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'This is not JSON',
        }),
      },
    };

    await expect(generatePersonality('octocat', mockStats, mockGenAI as never)).rejects.toThrow();
  });
});
