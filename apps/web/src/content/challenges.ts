/**
 * Presentational fixture data for the public /challenges discovery page.
 *
 * OPEN QUESTION: several fields below (cover art, creator avatar/initials,
 * submission format, submission counts, reward breakdown, verification
 * requirement) are not yet part of the domain model in
 * `packages/shared/src/domain/entities.ts`, and `ChallengeService` in
 * `@creator-platform/api-client` only returns the bare `Challenge` entity
 * from an empty mock array today. Until those contracts grow the needed
 * view-model fields, this file is the single, isolated source of challenge
 * discovery content — deliberately kept out of the component files, and
 * shaped as an async loader so swapping it for a real
 * `ChallengeService`-backed view model later is a one-file change. Mirrors
 * the same pattern already used by `content/homepage.ts`.
 */

export type SubmissionFormat = "Image" | "Video" | "Text" | "Link";
export type ChallengeStatus = "open" | "ending-soon" | "upcoming" | "completed";
export type RewardType = "winner" | "participation" | "both";
export type VerificationFilter = "required" | "not-required";

export interface TokenReward {
  amount: number;
  token: string;
}

export interface DiscoverChallenge {
  id: string;
  title: string;
  description: string;
  creatorName: string;
  creatorInitials: string;
  accent: string;
  format: SubmissionFormat;
  /** Optional display override for the format badge, e.g. "Poll or Image". */
  formatNote?: string;
  status: ChallengeStatus;
  statusLabel: string;
  rewardType: RewardType;
  winnerReward?: TokenReward;
  /** True when a winner reward is planned but not yet announced. */
  rewardTBA?: boolean;
  participationReward?: TokenReward;
  submissionCount: number;
  verificationRequired: boolean;
  /** Lower means ending sooner; absent for upcoming/completed challenges. */
  daysRemaining?: number;
  /** Lower means posted more recently; used for the "Newest" sort. */
  recencyRank: number;
  featured?: boolean;
}

export const DISCOVER_CHALLENGES: DiscoverChallenge[] = [
  {
    id: "cover-art-single",
    title: "Design the cover for my next single",
    description:
      "Design a bold, single-ready cover for Lena's next release. Any style — just make it unmistakably hers.",
    creatorName: "Lena Music",
    creatorInitials: "LM",
    accent: "var(--color-stage-pink)",
    format: "Image",
    status: "ending-soon",
    statusLabel: "Ends in 2 days",
    rewardType: "both",
    winnerReward: { amount: 700, token: "LENA" },
    participationReward: { amount: 20, token: "LENA" },
    submissionCount: 312,
    verificationRequired: true,
    daysRemaining: 2,
    recencyRank: 1,
    featured: true,
  },
  {
    id: "best-edit-video",
    title: "Create the best edit from my latest video",
    description:
      "Cut together your favorite moments from Nova's latest video drop. Best edit gets featured on her channel.",
    creatorName: "Nova Wave",
    creatorInitials: "NW",
    accent: "var(--color-stage-cyan)",
    format: "Video",
    status: "open",
    statusLabel: "Ends in 5 days",
    rewardType: "winner",
    winnerReward: { amount: 1000, token: "NOVA" },
    submissionCount: 189,
    verificationRequired: false,
    daysRemaining: 5,
    recencyRank: 2,
  },
  {
    id: "mascot-outfit",
    title: "Draw a new outfit for the mascot",
    description:
      "Reimagine Mika's mascot in a fresh outfit. Sketch, paint, or render — surprise the community.",
    creatorName: "Mika Live",
    creatorInitials: "ML",
    accent: "var(--color-stage-mint)",
    format: "Image",
    status: "open",
    statusLabel: "Ends in 9 days",
    rewardType: "both",
    winnerReward: { amount: 500, token: "MIKA" },
    participationReward: { amount: 10, token: "MIKA" },
    submissionCount: 421,
    verificationRequired: false,
    daysRemaining: 9,
    recencyRank: 4,
  },
  {
    id: "live-show-concept",
    title: "Suggest the concept for my next live show",
    description:
      "Pitch the theme, setlist, or format for BeatLab's next live show. Best concept gets produced.",
    creatorName: "BeatLab",
    creatorInitials: "BL",
    accent: "var(--color-stage-lavender)",
    format: "Text",
    status: "open",
    statusLabel: "Ends in 6 days",
    rewardType: "winner",
    winnerReward: { amount: 800, token: "BEAT" },
    submissionCount: 97,
    verificationRequired: true,
    daysRemaining: 6,
    recencyRank: 3,
  },
  {
    id: "fan-trailer",
    title: "Create a fan trailer",
    description:
      "Cut a trailer that captures the Ava Studio vibe. Short, punchy, and shareable.",
    creatorName: "Ava Studio",
    creatorInitials: "AS",
    accent: "var(--color-stage-aqua)",
    format: "Video",
    status: "open",
    statusLabel: "Ends in 12 days",
    rewardType: "winner",
    winnerReward: { amount: 1200, token: "AVA" },
    submissionCount: 64,
    verificationRequired: false,
    daysRemaining: 12,
    recencyRank: 6,
  },
  {
    id: "merch-design-vote",
    title: "Choose the next merch design",
    description:
      "Vote on or submit your take on Lena's next merch drop before it goes into production.",
    creatorName: "Lena Music",
    creatorInitials: "LM",
    accent: "var(--color-stage-pink)",
    format: "Image",
    formatNote: "Poll or Image",
    status: "upcoming",
    statusLabel: "Starts in 4 days",
    rewardType: "winner",
    rewardTBA: true,
    submissionCount: 0,
    verificationRequired: false,
    recencyRank: 8,
  },
  {
    id: "cosplay-recreation",
    title: "Recreate the ultimate cosplay look",
    description:
      "Recreate your favorite look with your own spin — accuracy and creativity both count.",
    creatorName: "Mika Live",
    creatorInitials: "ML",
    accent: "var(--color-stage-mint)",
    format: "Image",
    status: "completed",
    statusLabel: "Ended · Winner announced",
    rewardType: "winner",
    winnerReward: { amount: 650, token: "MIKA" },
    submissionCount: 288,
    verificationRequired: true,
    recencyRank: 7,
  },
  {
    id: "remix-track",
    title: "Remix my new track",
    description:
      "Remix BeatLab's newest track into something entirely your own. Any genre welcome.",
    creatorName: "BeatLab",
    creatorInitials: "BL",
    accent: "var(--color-stage-lavender)",
    format: "Video",
    status: "ending-soon",
    statusLabel: "Ends in 1 day",
    rewardType: "both",
    winnerReward: { amount: 900, token: "BEAT" },
    participationReward: { amount: 25, token: "BEAT" },
    submissionCount: 156,
    verificationRequired: true,
    daysRemaining: 1,
    recencyRank: 5,
  },
  {
    id: "fanfic-chapter",
    title: "Write the next chapter with me",
    description:
      "Add the next chapter to an ongoing community story — keep the tone, take it anywhere.",
    creatorName: "Ava Studio",
    creatorInitials: "AS",
    accent: "var(--color-stage-aqua)",
    format: "Text",
    status: "open",
    statusLabel: "Ends in 8 days",
    rewardType: "participation",
    participationReward: { amount: 15, token: "AVA" },
    submissionCount: 43,
    verificationRequired: false,
    daysRemaining: 8,
    recencyRank: 9,
  },
  {
    id: "dream-portfolio-link",
    title: "Share your dream portfolio link",
    description:
      "Drop a link to your dream portfolio, playlist, or project page. Best link gets shared to Nova's audience.",
    creatorName: "Nova Wave",
    creatorInitials: "NW",
    accent: "var(--color-stage-cyan)",
    format: "Link",
    status: "open",
    statusLabel: "Ends in 14 days",
    rewardType: "both",
    winnerReward: { amount: 300, token: "NOVA" },
    participationReward: { amount: 5, token: "NOVA" },
    submissionCount: 72,
    verificationRequired: false,
    daysRemaining: 14,
    recencyRank: 10,
  },
];

export interface ChallengeFilterState {
  status: ChallengeStatus[];
  format: SubmissionFormat[];
  rewardType: RewardType[];
  verification: VerificationFilter[];
}

export const EMPTY_CHALLENGE_FILTERS: ChallengeFilterState = {
  status: [],
  format: [],
  rewardType: [],
  verification: [],
};

/**
 * Simulates an async service call so the loading/error UI has a real
 * asynchronous boundary to exercise, matching the shape a future
 * `ChallengeService`-backed call would have.
 */
export function getDiscoverChallenges(): Promise<DiscoverChallenge[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(DISCOVER_CHALLENGES), 500);
  });
}
