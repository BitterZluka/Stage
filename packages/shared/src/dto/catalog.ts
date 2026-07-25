export type CatalogCreatorCategory =
  | "Music"
  | "Art"
  | "Video"
  | "Fashion"
  | "Gaming"
  | "Lifestyle"
  | "Education"
  | "Streaming";

export interface CatalogCreator {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  category: CatalogCreatorCategory;
  tokenName: string;
  tokenSymbol: string;
  followersCount: number;
  activeChallengesCount: number;
  perksCount: number;
  verified: boolean;
  featured: boolean;
  trending: boolean;
  recentlyActive: boolean;
  createdAt: string;
  source: "demo" | "database";
}

export interface CatalogChallenge {
  id: string;
  creatorId: string;
  creatorTokenId?: string;
  creatorHandle: string;
  creatorName: string;
  title: string;
  description: string;
  status: "draft" | "published" | "judging" | "completed" | "cancelled";
  submissionKind: "link" | "text" | "image" | "video";
  verificationMode: "manual" | "automatic";
  requiresWorldVerification: boolean;
  participationRewardAmount: string;
  rewardAmount: string;
  maxWinners: number;
  winnerCount: number;
  submissionCount: number;
  startsAt: string;
  submissionDeadline: string;
  createdAt: string;
  featured: boolean;
  source: "demo" | "database";
}

export type CatalogPerkCategory = "Merch" | "Digital" | "Experience";

export interface CatalogPerk {
  id: string;
  creatorId: string;
  creatorHandle: string;
  creatorName: string;
  title: string;
  description: string;
  category: CatalogPerkCategory;
  tokenThreshold: string;
  tokenSymbol: string;
  inventory: number;
  claimedCount: number;
  status: "active" | "paused" | "exhausted";
  requiresWorldVerification: boolean;
  createdAt: string;
  featured: boolean;
  source: "demo" | "database";
}

export interface CatalogResponse<T> {
  items: T[];
}

export interface CatalogCreatorProfile {
  creator: CatalogCreator;
  challenges: CatalogChallenge[];
  perks: CatalogPerk[];
}
