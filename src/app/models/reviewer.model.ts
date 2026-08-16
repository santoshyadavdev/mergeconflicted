export interface ReviewStats {
  reviewsAnalyzed: number;
  approvalRate: string;
  avgCommentLength: number;
  mostActiveDay: string;
}

export interface ReviewerPersonality {
  archetype: string;
  emoji: string;
  tagline: string;
  description: string;
  strengths: string[];
  funFacts: string[];
  reviewStyle: string;
  stats: ReviewStats;
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
}

export interface ReviewAnalysisResponse {
  personality: ReviewerPersonality;
  profile: GitHubUserProfile;
  cachedAt: string | null;
}
