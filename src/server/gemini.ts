import { GoogleGenAI } from '@google/genai/web';
import { ReviewerPersonality } from '../app/models/reviewer.model';
import { GitHubAggregatedStats } from './github';

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

function buildPrompt(username: string, stats: GitHubAggregatedStats): string {
  const totalReviews = stats.totalReviewEvents || 1;
  const approvalRate = Math.round((stats.approvedCount / totalReviews) * 100);
  const changesRate = Math.round((stats.changesRequestedCount / totalReviews) * 100);
  const mostActiveDay =
    Object.entries(stats.reviewDays).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Unknown';

  const statsJson = JSON.stringify(
    {
      username,
      totalPRsReviewed: stats.totalPRsReviewed,
      recentReviewEvents: stats.totalReviewEvents,
      approvalRate: `${approvalRate}%`,
      changesRequestedRate: `${changesRate}%`,
      avgCommentLength: stats.avgCommentLength,
      reviewCommentCount: stats.reviewCommentCount,
      mostActiveDay,
      reviewDayDistribution: stats.reviewDays,
      sampleComments: stats.commentBodies.slice(0, 5),
    },
    null,
    2,
  );

  return `You are a fun, witty personality analyzer for code reviewers on GitHub.
Given these GitHub review stats for user "${username}":
${statsJson}

Classify them into a reviewer archetype. Be creative, funny, and insightful.
Consider patterns like: high approval rate with very few or short comments may indicate
someone who delegates reviews to AI tools (e.g., "The AI Delegator", "The Bot Whisperer").
Other archetypes might include The Nitpicker, The Mentor, The Rubber Stamper, The Gatekeeper, etc.
Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "archetype": "string — the personality name (e.g., The Nitpicker, The Mentor, The Rubber Stamper)",
  "emoji": "string — a single emoji representing the archetype",
  "tagline": "string — a witty one-liner catchphrase",
  "description": "string — 2-3 sentence personality description",
  "strengths": ["string", "string", "string"],
  "funFacts": ["string", "string"],
  "reviewStyle": "string — brief description of their review approach",
  "stats": {
    "reviewsAnalyzed": ${stats.totalPRsReviewed},
    "approvalRate": "${approvalRate}%",
    "avgCommentLength": ${stats.avgCommentLength},
    "mostActiveDay": "${mostActiveDay}"
  }
}`;
}

function parseGeminiResponse(text: string): ReviewerPersonality {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Validate all required fields and types
  if (typeof parsed['archetype'] !== 'string' || !parsed['archetype']) {
    throw new Error('Invalid personality response: missing archetype');
  }
  if (typeof parsed['emoji'] !== 'string' || !parsed['emoji']) {
    throw new Error('Invalid personality response: missing emoji');
  }
  if (typeof parsed['tagline'] !== 'string' || !parsed['tagline']) {
    throw new Error('Invalid personality response: missing tagline');
  }
  if (typeof parsed['description'] !== 'string' || !parsed['description']) {
    throw new Error('Invalid personality response: missing description');
  }
  if (!Array.isArray(parsed['strengths']) || parsed['strengths'].length === 0) {
    throw new Error('Invalid personality response: strengths must be a non-empty array');
  }
  if (!Array.isArray(parsed['funFacts']) || parsed['funFacts'].length === 0) {
    throw new Error('Invalid personality response: funFacts must be a non-empty array');
  }
  if (typeof parsed['reviewStyle'] !== 'string' || !parsed['reviewStyle']) {
    throw new Error('Invalid personality response: missing reviewStyle');
  }

  return parsed as unknown as ReviewerPersonality;
}

export async function generatePersonality(
  username: string,
  stats: GitHubAggregatedStats,
  genAI: GoogleGenAI,
): Promise<ReviewerPersonality> {
  const prompt = buildPrompt(username, stats);

  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  const personality = parseGeminiResponse(text);

  // Overwrite stats with server-computed values from GitHub data
  const totalReviews = stats.totalReviewEvents || 1;
  const approvalRate = Math.round((stats.approvedCount / totalReviews) * 100);
  const mostActiveDay =
    Object.entries(stats.reviewDays).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Unknown';

  personality.stats = {
    reviewsAnalyzed: stats.totalPRsReviewed,
    approvalRate: `${approvalRate}%`,
    avgCommentLength: stats.avgCommentLength,
    mostActiveDay,
  };

  return personality;
}
