import {
  ApiCatalogService,
  type CatalogChallenge,
  type CatalogCreator,
  type CatalogPerk,
} from "@creator-platform/api-client";
import type { DiscoverChallenge } from "../content/challenges";
import type { DiscoverCreator } from "../content/creators";

const ACCENTS = [
  "var(--color-stage-pink)",
  "var(--color-stage-cyan)",
  "var(--color-stage-mint)",
  "var(--color-stage-lavender)",
  "var(--color-stage-aqua)",
] as const;

export const catalogService = new ApiCatalogService(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
);

function accentFor(value: string): string {
  let hash = 0;
  for (const character of value)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return ACCENTS[hash % ACCENTS.length]!;
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function challengeStatus(
  challenge: CatalogChallenge,
): DiscoverChallenge["status"] {
  if (challenge.status === "completed" || challenge.status === "cancelled")
    return "completed";
  if (
    new Date(challenge.startsAt).getTime() > Date.now() ||
    challenge.status === "draft"
  )
    return "upcoming";
  const days = Math.ceil(
    (new Date(challenge.submissionDeadline).getTime() - Date.now()) /
      86_400_000,
  );
  return days <= 2 ? "ending-soon" : "open";
}

function deadlineDetails(challenge: CatalogChallenge): {
  daysRemaining?: number;
  statusLabel: string;
} {
  const startsIn = Math.ceil(
    (new Date(challenge.startsAt).getTime() - Date.now()) / 86_400_000,
  );
  if (startsIn > 0)
    return {
      statusLabel: `Starts in ${startsIn} ${startsIn === 1 ? "day" : "days"}`,
    };
  if (challenge.status === "completed" || challenge.status === "cancelled") {
    return {
      statusLabel: challenge.status === "completed" ? "Ended" : "Cancelled",
    };
  }
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(challenge.submissionDeadline).getTime() - Date.now()) /
        86_400_000,
    ),
  );
  return {
    daysRemaining,
    statusLabel:
      daysRemaining === 0
        ? "Ends today"
        : `Ends in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`,
  };
}

export function mapCatalogChallenge(
  challenge: CatalogChallenge,
): DiscoverChallenge {
  const deadline = deadlineDetails(challenge);
  const formats: Record<
    CatalogChallenge["submissionKind"],
    DiscoverChallenge["format"]
  > = {
    image: "Image",
    video: "Video",
    text: "Text",
    link: "Link",
  };
  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    creatorName: challenge.creatorName,
    creatorInitials: initials(challenge.creatorName),
    accent: accentFor(challenge.creatorId),
    format: formats[challenge.submissionKind],
    status: challengeStatus(challenge),
    statusLabel: deadline.statusLabel,
    rewardType: "winner",
    winnerReward: {
      amount: Number(challenge.rewardAmount),
      token: "tokens",
    },
    submissionCount: challenge.submissionCount,
    ...(deadline.daysRemaining === undefined
      ? {}
      : { daysRemaining: deadline.daysRemaining }),
    recencyRank: -new Date(challenge.createdAt).getTime(),
  };
}

export function mapCatalogCreator(creator: CatalogCreator): DiscoverCreator {
  return {
    id: creator.id,
    slug: creator.handle,
    displayName: creator.displayName,
    username: `@${creator.handle}`,
    bio: creator.bio,
    category: creator.category,
    accent: accentFor(creator.id),
    avatarInitials: initials(creator.displayName),
    tokenName: creator.tokenName,
    tokenSymbol: creator.tokenSymbol,
    followersCount: creator.followersCount,
    activeChallengesCount: creator.activeChallengesCount,
    perksCount: creator.perksCount,
    verified: creator.verified,
    featured: creator.featured,
    trending: creator.trending,
    recentlyActive: creator.recentlyActive,
    createdAt: creator.createdAt,
  };
}

export function perkAccent(perk: CatalogPerk): string {
  return accentFor(perk.id);
}
