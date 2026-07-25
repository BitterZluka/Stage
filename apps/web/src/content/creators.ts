/**
 * Presentational fixture data for the public /creators discovery page.
 *
 * OPEN QUESTION: several fields below (bio, category, avatar/cover treatment,
 * token identity, follower/challenge/perk counts, verification, trending)
 * are not yet part of the domain model in
 * `packages/shared/src/domain/entities.ts`, and `CreatorService` in
 * `@creator-platform/api-client` only returns the bare `Creator` entity
 * (id, handle, displayName, status) from an empty mock array today. Until
 * those contracts grow the needed view-model fields, this file is the
 * single, isolated source of creator discovery content — deliberately kept
 * out of the component files, and shaped as an async loader so swapping it
 * for a real `CreatorService`-backed view model later is a one-file change.
 * Mirrors the same pattern already used by `content/challenges.ts`.
 */

export type CreatorCategory =
  | "Music"
  | "Art"
  | "Video"
  | "Fashion"
  | "Gaming"
  | "Lifestyle"
  | "Education"
  | "Streaming";

export type ActivityFilter =
  "active-challenges" | "perks-available" | "recently-active";
export type CommunitySize = "emerging" | "growing" | "established";

export interface CreatorHighlight {
  kind: "challenge" | "perk";
  title: string;
  detail: string;
}

export interface DiscoverCreator {
  id: string;
  slug: string;
  displayName: string;
  username: string;
  bio: string;
  category: CreatorCategory;
  accent: string;
  avatarInitials: string;
  tokenName: string;
  tokenSymbol: string;
  followersCount: number;
  activeChallengesCount: number;
  perksCount: number;
  verified?: boolean;
  featured?: boolean;
  trending?: boolean;
  recentlyActive?: boolean;
  createdAt: string;
  highlight?: CreatorHighlight;
}

/** Follower-count bucketing used by the "Community size" filter group. */
export function communitySizeOf(creator: DiscoverCreator): CommunitySize {
  if (creator.followersCount >= 25_000) return "established";
  if (creator.followersCount >= 10_000) return "growing";
  return "emerging";
}

export const DISCOVER_CREATORS: DiscoverCreator[] = [
  {
    id: "lena-music",
    slug: "lenamusic",
    displayName: "Lena Music",
    username: "@lenamusic",
    bio: "Singer and songwriter creating new releases with her community.",
    category: "Music",
    accent: "var(--color-stage-pink)",
    avatarInitials: "LM",
    tokenName: "Lena",
    tokenSymbol: "LENA",
    followersCount: 24_800,
    activeChallengesCount: 2,
    perksCount: 5,
    featured: true,
    trending: true,
    recentlyActive: true,
    createdAt: "2025-02-11T00:00:00.000Z",
    highlight: {
      kind: "challenge",
      title: "Design the cover for my next single",
      detail: "312 submissions · Ends in 2 days",
    },
  },
  {
    id: "nova-wave",
    slug: "novawave",
    displayName: "Nova Wave",
    username: "@novawave",
    bio: "Video creator, editor, and visual storyteller.",
    category: "Video",
    accent: "var(--color-stage-cyan)",
    avatarInitials: "NW",
    tokenName: "Nova",
    tokenSymbol: "NOVA",
    followersCount: 18_200,
    activeChallengesCount: 1,
    perksCount: 3,
    recentlyActive: true,
    createdAt: "2025-03-04T00:00:00.000Z",
  },
  {
    id: "mika-live",
    slug: "mikalive",
    displayName: "Mika Live",
    username: "@mikalive",
    bio: "Live creator building shows together with the audience.",
    category: "Streaming",
    accent: "var(--color-stage-mint)",
    avatarInitials: "ML",
    tokenName: "Mika",
    tokenSymbol: "MIKA",
    followersCount: 31_400,
    activeChallengesCount: 3,
    perksCount: 6,
    trending: true,
    recentlyActive: true,
    createdAt: "2024-11-20T00:00:00.000Z",
  },
  {
    id: "beatlab",
    slug: "beatlab",
    displayName: "BeatLab",
    username: "@beatlab",
    bio: "Producer community for beats, remixes, and live sessions.",
    category: "Music",
    accent: "var(--color-stage-lavender)",
    avatarInitials: "BL",
    tokenName: "Beat",
    tokenSymbol: "BEAT",
    followersCount: 12_700,
    activeChallengesCount: 2,
    perksCount: 4,
    createdAt: "2025-01-08T00:00:00.000Z",
  },
  {
    id: "ava-studio",
    slug: "avastudio",
    displayName: "Ava Studio",
    username: "@avastudio",
    bio: "Digital artist exploring illustration, animation, and fan-made worlds.",
    category: "Art",
    accent: "var(--color-stage-aqua)",
    avatarInitials: "AS",
    tokenName: "Ava",
    tokenSymbol: "AVA",
    followersCount: 16_900,
    activeChallengesCount: 1,
    perksCount: 4,
    createdAt: "2025-04-17T00:00:00.000Z",
  },
  {
    id: "rue-archive",
    slug: "ruearchive",
    displayName: "Rue Archive",
    username: "@ruearchive",
    bio: "Fashion concepts, styling challenges, and limited community drops.",
    category: "Fashion",
    accent: "var(--color-stage-pink)",
    avatarInitials: "RA",
    tokenName: "Rue",
    tokenSymbol: "RUE",
    followersCount: 9_600,
    activeChallengesCount: 1,
    perksCount: 2,
    createdAt: "2025-05-02T00:00:00.000Z",
  },
  {
    id: "pixel-forge",
    slug: "pixelforge",
    displayName: "Pixel Forge",
    username: "@pixelforge",
    bio: "Speedrunning and game-dev community shipping small games together.",
    category: "Gaming",
    accent: "var(--color-stage-cyan)",
    avatarInitials: "PF",
    tokenName: "Pixel",
    tokenSymbol: "PXL",
    followersCount: 21_300,
    activeChallengesCount: 2,
    perksCount: 3,
    recentlyActive: true,
    createdAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "slow-living-co",
    slug: "slowlivingco",
    displayName: "Slow Living Co",
    username: "@slowlivingco",
    bio: "Mindful routines, seasonal rituals, and low-key lifestyle challenges.",
    category: "Lifestyle",
    accent: "var(--color-stage-mint)",
    avatarInitials: "SL",
    tokenName: "Slow",
    tokenSymbol: "SLOW",
    followersCount: 7_200,
    activeChallengesCount: 1,
    perksCount: 2,
    createdAt: "2025-06-19T00:00:00.000Z",
  },
  {
    id: "lex-learns",
    slug: "lexlearns",
    displayName: "Lex Learns",
    username: "@lexlearns",
    bio: "Teaching creative skills through bite-sized lessons and cohorts.",
    category: "Education",
    accent: "var(--color-stage-lavender)",
    avatarInitials: "LL",
    tokenName: "Lex",
    tokenSymbol: "LEX",
    followersCount: 5_400,
    activeChallengesCount: 1,
    perksCount: 3,
    trending: true,
    createdAt: "2025-07-05T00:00:00.000Z",
  },
];

export interface CreatorFilterState {
  category: CreatorCategory[];
  activity: ActivityFilter[];
  communitySize: CommunitySize[];
}

export const EMPTY_CREATOR_FILTERS: CreatorFilterState = {
  category: [],
  activity: [],
  communitySize: [],
};

/**
 * Simulates an async service call so the loading/error UI has a real
 * asynchronous boundary to exercise, matching the shape a future
 * `CreatorService`-backed call would have.
 */
export function getDiscoverCreators(): Promise<DiscoverCreator[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(DISCOVER_CREATORS), 500);
  });
}
