import { GoogleGenAI } from '@google/genai/web';
import { ReviewAnalysisResponse } from '../app/models/reviewer.model';
import { fetchGitHubStats } from './github';
import { generatePersonality } from './gemini';

const CACHE_TTL_SECONDS = 86400; // 24 hours

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function handleReviewRequest(
  username: string,
  forceRefresh: boolean,
  kv: KVNamespace,
  geminiApiKey: string,
  githubToken?: string,
): Promise<ReviewAnalysisResponse> {
  const cacheKey = `reviewer:${username.toLowerCase()}`;

  // Check cache unless force refresh — treat KV as optional
  if (!forceRefresh) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as ReviewAnalysisResponse;
      }
    } catch {
      // KV read/parse failure — skip cache, fetch fresh
    }
  }

  // Fetch GitHub data
  const { profile, stats } = await fetchGitHubStats(username, undefined, githubToken);

  // Check if user has any review activity
  if (stats.totalReviewEvents === 0 && stats.totalPRsReviewed === 0) {
    throw new Error('No review activity found');
  }

  // Generate personality via Gemini
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const personality = await generatePersonality(username, stats, genAI);

  const response: ReviewAnalysisResponse = {
    personality,
    profile,
    cachedAt: null,
  };

  // Cache the result — ignore write failures
  try {
    const toCache: ReviewAnalysisResponse = {
      ...response,
      cachedAt: new Date().toISOString(),
    };
    await kv.put(cacheKey, JSON.stringify(toCache), { expirationTtl: CACHE_TTL_SECONDS });
  } catch {
    // KV write failure — result is still valid, skip caching
  }

  return response;
}
