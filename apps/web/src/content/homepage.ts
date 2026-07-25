/**
 * Presentational fixture data for the public homepage's marketing sections.
 *
 * OPEN QUESTION: several fields below (challenge cover art, submission
 * counts, creator avatars/follower counts/verification badges, community
 * token symbols) are not yet part of the domain model in
 * `packages/shared/src/domain/entities.ts`, and no mock service in
 * `@creator-platform/api-client` returns them (only Challenge/Creator/Reward
 * have mocks today, and they start from empty arrays). Until those contracts
 * grow the needed view-model fields, this file is the single, isolated
 * source of homepage marketing content — deliberately kept out of the
 * component files so swapping it for real `ChallengeService`/
 * `CreatorService` data later is a one-file change.
 */

export type SubmissionFormat = "Image" | "Video" | "Text" | "Link";

export interface TrendingChallenge {
  id: string;
  title: string;
  creatorName: string;
  creatorInitials: string;
  format: SubmissionFormat;
  deadlineLabel: string;
  winnerReward: number;
  participationReward?: number;
  submissionCount: number;
  verified: boolean;
  accent: string;
}

export const TRENDING_CHALLENGES: TrendingChallenge[] = [
  {
    id: "summer-fit",
    title: "Best Summer Fit",
    creatorName: "Nova Wave",
    creatorInitials: "NW",
    format: "Image",
    deadlineLabel: "3 days left",
    winnerReward: 500,
    participationReward: 25,
    submissionCount: 847,
    verified: true,
    accent: "var(--color-stage-cyan)",
  },
  {
    id: "dance-drop",
    title: "60-Second Dance Drop",
    creatorName: "Crystal Void",
    creatorInitials: "CV",
    format: "Video",
    deadlineLabel: "5 days left",
    winnerReward: 1200,
    submissionCount: 234,
    verified: true,
    accent: "var(--color-stage-pink)",
  },
  {
    id: "fan-art-friday",
    title: "Fan Art Friday",
    creatorName: "Neon Petal",
    creatorInitials: "NP",
    format: "Image",
    deadlineLabel: "1 day left",
    winnerReward: 750,
    participationReward: 10,
    submissionCount: 1203,
    verified: false,
    accent: "var(--color-stage-lavender)",
  },
  {
    id: "vibe-caption",
    title: "Vibe Caption Drop",
    creatorName: "Glitch God",
    creatorInitials: "GG",
    format: "Text",
    deadlineLabel: "7 days left",
    winnerReward: 300,
    submissionCount: 456,
    verified: false,
    accent: "var(--color-stage-mint)",
  },
  {
    id: "link-in-bio",
    title: "Dream Link in Bio",
    creatorName: "Moon Byte",
    creatorInitials: "MB",
    format: "Link",
    deadlineLabel: "10 days left",
    winnerReward: 200,
    submissionCount: 88,
    verified: false,
    accent: "var(--color-stage-yellow)",
  },
  {
    id: "cloud-core",
    title: "Cloud Core Outfit Check",
    creatorName: "Pastel Prince",
    creatorInitials: "PP",
    format: "Image",
    deadlineLabel: "2 days left",
    winnerReward: 900,
    participationReward: 15,
    submissionCount: 567,
    verified: true,
    accent: "var(--color-stage-aqua)",
  },
];

export interface FeaturedCreator {
  id: string;
  name: string;
  username: string;
  category: string;
  followers: string;
  activeChallenges: number;
  tokenSymbol: string;
  initials: string;
  accent: string;
}

export const FEATURED_CREATORS: FeaturedCreator[] = [
  {
    id: "novawave",
    name: "Nova Wave",
    username: "@novawave",
    category: "Fashion",
    followers: "284K",
    activeChallenges: 3,
    tokenSymbol: "$NOVA",
    initials: "NW",
    accent: "var(--color-stage-cyan)",
  },
  {
    id: "crystalvoid",
    name: "Crystal Void",
    username: "@crystalvoid",
    category: "Dance",
    followers: "192K",
    activeChallenges: 2,
    tokenSymbol: "$VOID",
    initials: "CV",
    accent: "var(--color-stage-lavender)",
  },
  {
    id: "neonpetal",
    name: "Neon Petal",
    username: "@neonpetal",
    category: "Art",
    followers: "531K",
    activeChallenges: 4,
    tokenSymbol: "$PETAL",
    initials: "NP",
    accent: "var(--color-stage-pink)",
  },
  {
    id: "glitchgod",
    name: "Glitch God",
    username: "@glitchgod",
    category: "Music",
    followers: "89K",
    activeChallenges: 1,
    tokenSymbol: "$GLTCH",
    initials: "GG",
    accent: "var(--color-stage-mint)",
  },
  {
    id: "moonbyte",
    name: "Moon Byte",
    username: "@moonbyte",
    category: "Gaming",
    followers: "156K",
    activeChallenges: 2,
    tokenSymbol: "$MOON",
    initials: "MB",
    accent: "var(--color-stage-yellow)",
  },
  {
    id: "pastelprince",
    name: "Pastel Prince",
    username: "@pastelprince",
    category: "Lifestyle",
    followers: "423K",
    activeChallenges: 5,
    tokenSymbol: "$PSTL",
    initials: "PP",
    accent: "var(--color-stage-aqua)",
  },
];

export interface HowItWorksStep {
  id: string;
  title: string;
  description: string;
  accent: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    id: "discover",
    title: "Discover & join",
    description:
      "Browse creator challenges across every category and jump into the ones that fit your vibe.",
    accent: "var(--color-stage-cyan)",
  },
  {
    id: "create",
    title: "Create & submit",
    description:
      "Share your take — image, video, text, or a link — and put it in front of the community.",
    accent: "var(--color-stage-pink)",
  },
  {
    id: "earn",
    title: "Earn credits",
    description:
      "Win challenges, get picked, or just show up — every contribution earns community credits.",
    accent: "var(--color-stage-lavender)",
  },
  {
    id: "unlock",
    title: "Unlock perks",
    description:
      "Trade credits for merch, VIP access, and experiences your favorite creators put on the line.",
    accent: "var(--color-stage-mint)",
  },
];

export interface FeaturedPerk {
  id: string;
  title: string;
  creatorName: string;
  cost: number;
  type: "Merch" | "Digital" | "Experience";
  accent: string;
}

export const FEATURED_PERKS: FeaturedPerk[] = [
  {
    id: "signed-print",
    title: "Signed Print Pack",
    creatorName: "Neon Petal",
    cost: 2000,
    type: "Merch",
    accent: "var(--color-stage-pink)",
  },
  {
    id: "discord-vip",
    title: "Discord VIP Access",
    creatorName: "Nova Wave",
    cost: 500,
    type: "Digital",
    accent: "var(--color-stage-cyan)",
  },
  {
    id: "video-call",
    title: "1-on-1 Video Call",
    creatorName: "Crystal Void",
    cost: 5000,
    type: "Experience",
    accent: "var(--color-stage-lavender)",
  },
  {
    id: "irl-meetup",
    title: "IRL Meetup Ticket",
    creatorName: "Pastel Prince",
    cost: 8000,
    type: "Experience",
    accent: "var(--color-stage-aqua)",
  },
];

export interface LeaderboardEntry {
  rank: number;
  user: string;
  points: number;
  submissions: number;
  wins: number;
}

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user: "@stardust.exe", points: 9847, submissions: 34, wins: 12 },
  { rank: 2, user: "@loopgirl", points: 8210, submissions: 28, wins: 9 },
  { rank: 3, user: "@void.jpeg", points: 7654, submissions: 45, wins: 7 },
  { rank: 4, user: "@mirage.wav", points: 6890, submissions: 22, wins: 6 },
  { rank: 5, user: "@kira.cloud", points: 5432, submissions: 19, wins: 4 },
];
