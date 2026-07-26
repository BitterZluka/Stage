import { Inject, Injectable } from "@nestjs/common";
import type {
  CatalogChallenge,
  CatalogCreator,
  CatalogCreatorCategory,
  CatalogCreatorProfile,
  CatalogPerk,
  CatalogPerkCategory,
  CatalogResponse,
} from "@creator-platform/shared";
import { DatabaseService } from "../database/database.service.js";

const PUBLIC_CHALLENGE_STATUSES = [
  "PUBLISHED",
  "JUDGING",
  "COMPLETED",
] as const;
const PUBLIC_PERK_STATUSES = ["ACTIVE", "PAUSED", "EXHAUSTED"] as const;

function compareCatalogItems(
  left: { id: string; featured: boolean; createdAt: string },
  right: { id: string; featured: boolean; createdAt: string },
): number {
  if (left.featured !== right.featured) return left.featured ? -1 : 1;
  const byDate = right.createdAt.localeCompare(left.createdAt);
  return byDate || left.id.localeCompare(right.id);
}

function inferCreatorCategory(
  handle: string,
  displayName: string,
): CatalogCreatorCategory {
  const value = `${handle} ${displayName}`.toLowerCase();
  if (/learn|course|school|teach/.test(value)) return "Education";
  if (/game|pixel|stream/.test(value)) return "Gaming";
  if (/video|film|edit|visual/.test(value)) return "Video";
  if (/fashion|style|archive/.test(value)) return "Fashion";
  if (/art|studio|draw|design/.test(value)) return "Art";
  if (/life|wellness|food|travel/.test(value)) return "Lifestyle";
  return "Music";
}

function inferPerkCategory(title: string): CatalogPerkCategory {
  if (/shirt|hoodie|vinyl|print|merch|signed/i.test(title)) return "Merch";
  if (/call|party|session|workshop|ticket|access|meet/i.test(title)) {
    return "Experience";
  }
  return "Digital";
}

@Injectable()
export class CatalogService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) { }

  async listCreators(): Promise<CatalogResponse<CatalogCreator>> {
    const rows = await this.database.creator.findMany({
      where: { status: "ACTIVE" },
      include: {
        token: true,
        challenges: {
          where: { status: { in: [...PUBLIC_CHALLENGE_STATUSES] } },
          select: { status: true },
        },
        perks: {
          where: { status: { in: [...PUBLIC_PERK_STATUSES] } },
          select: { id: true },
        },
      },
      orderBy: { id: "asc" },
    });
    const items: CatalogCreator[] = rows
      .map((creator) => ({
        id: creator.id,
        handle: creator.handle,
        displayName: creator.displayName,
        bio: `${creator.displayName}'s community hub for challenges, rewards, and token-gated experiences.`,
        category: inferCreatorCategory(creator.handle, creator.displayName),
        tokenName: creator.token?.name ?? `${creator.displayName} Token`,
        tokenSymbol:
          creator.token?.symbol ??
          creator.handle
            .replace(/[^a-z0-9]/gi, "")
            .slice(0, 5)
            .toUpperCase(),
        followersCount: 0,
        activeChallengesCount: creator.challenges.filter(
          ({ status }) => status === "PUBLISHED" || status === "JUDGING",
        ).length,
        perksCount: creator.perks.length,
        verified: Boolean(creator.token?.hederaTokenId),
        featured: false,
        trending: false,
        recentlyActive:
          creator.challenges.length > 0 || creator.perks.length > 0,
        createdAt: creator.createdAt.toISOString(),
        source: "database" as const,
      }))
      .sort(compareCatalogItems);

    return { items };
  }

  async getCreator(handle: string): Promise<CatalogCreatorProfile | null> {
    const normalizedHandle = handle.toLowerCase();
    const [creators, challenges, perks] = await Promise.all([
      this.listCreators(),
      this.listChallenges(),
      this.listPerks(),
    ]);
    const creator = creators.items.find(
      (item) => item.handle.toLowerCase() === normalizedHandle,
    );
    if (!creator) return null;

    return {
      creator,
      challenges: challenges.items.filter(
        (challenge) => challenge.creatorId === creator.id,
      ),
      perks: perks.items.filter((perk) => perk.creatorId === creator.id),
    };
  }

  async listChallenges(): Promise<CatalogResponse<CatalogChallenge>> {
    const rows = await this.database.challenge.findMany({
      where: {
        status: { in: [...PUBLIC_CHALLENGE_STATUSES] },
        creator: { status: "ACTIVE" },
      },
      include: {
        creator: {
          select: {
            handle: true,
            displayName: true,
            token: { select: { hederaTokenId: true } },
          },
        },
        rewardRule: true,
        _count: { select: { submissions: true, reservations: true } },
      },
      orderBy: { id: "asc" },
    });
    const items: CatalogChallenge[] = rows
      .map((challenge) => ({
        id: challenge.id,
        creatorId: challenge.creatorId,
        ...(challenge.creator.token?.hederaTokenId
          ? { creatorTokenId: challenge.creator.token.hederaTokenId }
          : {}),
        creatorHandle: challenge.creator.handle,
        creatorName: challenge.creator.displayName,
        title: challenge.title,
        description: challenge.description,
        status: challenge.status.toLowerCase() as CatalogChallenge["status"],
        submissionKind:
          challenge.submissionKind.toLowerCase() as CatalogChallenge["submissionKind"],
        verificationMode:
          challenge.verificationMode === "AUTOMATIC" ? "automatic" : "manual",
        requiresWorldVerification: challenge.requiresWorldVerification,
        participationRewardAmount:
          challenge.rewardRule?.participationAmount ?? "0",
        rewardAmount: challenge.rewardRule?.amount ?? "0",
        maxWinners: challenge.rewardRule?.maxWinners ?? 0,
        winnerCount: challenge._count.reservations,
        submissionCount: challenge._count.submissions,
        startsAt: challenge.startsAt.toISOString(),
        submissionDeadline: challenge.submissionDeadline.toISOString(),
        createdAt: challenge.createdAt.toISOString(),
        featured: false,
        source: "database" as const,
      }))
      .sort(compareCatalogItems);

    return { items };
  }

  async getChallenge(challengeId: string): Promise<CatalogChallenge | null> {
    const { items } = await this.listChallenges();
    return items.find(({ id }) => id === challengeId) ?? null;
  }

  async listPerks(creatorId?: string): Promise<CatalogResponse<CatalogPerk>> {
    const rows = await this.database.perk.findMany({
      where: {
        status: { in: [...PUBLIC_PERK_STATUSES] },
        creator: { status: "ACTIVE" },
        ...(creatorId ? { creatorId } : {}),
      },
      include: {
        creator: {
          select: {
            handle: true,
            displayName: true,
            token: { select: { symbol: true, hederaTokenId: true } },
          },
        },
      },
      orderBy: { id: "asc" },
    });
    const databasePerks: CatalogPerk[] = rows.map((perk) => ({
      id: perk.id,
      creatorId: perk.creatorId,
      ...(perk.creator.token?.hederaTokenId
        ? { creatorTokenId: perk.creator.token.hederaTokenId }
        : {}),
      creatorHandle: perk.creator.handle,
      creatorName: perk.creator.displayName,
      title: perk.title,
      description: perk.description,
      category: inferPerkCategory(perk.title),
      tokenThreshold: perk.tokenThreshold,
      tokenSymbol:
        perk.creator.token?.symbol ??
        perk.creator.handle
          .replace(/[^a-z0-9]/gi, "")
          .slice(0, 5)
          .toUpperCase(),
      inventory: perk.inventory,
      claimedCount: perk.claimedCount,
      status: perk.status.toLowerCase() as CatalogPerk["status"],
      requiresWorldVerification: perk.requiresWorldVerification,
      createdAt: perk.createdAt.toISOString(),
      featured: false,
      source: "database",
    }));
    const demoPerks = creatorId
      ? DEMO_PERKS.filter((perk) => perk.creatorId === creatorId)
      : DEMO_PERKS;

    return {
      items: mergeById(databasePerks, demoPerks).sort(compareCatalogItems),
    };
  }
}
