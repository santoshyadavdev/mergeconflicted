import { GoogleGenAI } from '@google/genai';
import { ReviewerPersonality } from '../app/models/reviewer.model';
import { GitHubAggregatedStats } from './github';

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
  const parsed = JSON.parse(cleaned) as ReviewerPersonality;

  // Validate required fields
  if (!parsed.archetype || !parsed.emoji || !parsed.tagline) {
    throw new Error('Invalid personality response: missing required fields');
  }

  return parsed;
}

export async function generatePersonality(
  username: string,
  stats: GitHubAggregatedStats,
  genAI: GoogleGenAI,
): Promise<ReviewerPersonality> {
  const prompt = buildPrompt(username, stats);

  const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return parseGeminiResponse(text);
}
