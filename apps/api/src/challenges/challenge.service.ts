import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import type {
  CreateChallengeDto,
  ListChallengesQuery,
  UpdateChallengeDto,
} from "./challenge.schemas.js";

const statusMap = {
  DRAFT: "draft",
  PUBLISHED: "published",
  JUDGING: "judging",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

function assertBudget(amount: string, maxWinners: number): void {
  const budget = BigInt(amount) * BigInt(maxWinners);
  const maximum = BigInt(
    process.env.MAX_CHALLENGE_REWARD_BUDGET ?? "1000000000000",
  );
  if (budget > maximum) {
    throw new UnprocessableEntityException({
      error: {
        code: "REWARD_BUDGET_EXCEEDED",
        message: `Reward budget exceeds the configured maximum of ${maximum}`,
      },
    });
  }
}

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ error: { code, message } });
}

export type ChallengeAction = "close" | "complete" | "cancel";

export function challengeTransitionTarget(
  status: "DRAFT" | "PUBLISHED" | "JUDGING" | "COMPLETED" | "CANCELLED",
  action: ChallengeAction,
): "JUDGING" | "COMPLETED" | "CANCELLED" | null {
  if (action === "close" && status === "PUBLISHED") return "JUDGING";
  if (action === "complete" && status === "JUDGING") return "COMPLETED";
  if (
    action === "cancel" &&
    (status === "DRAFT" || status === "PUBLISHED" || status === "JUDGING")
  ) {
    return "CANCELLED";
  }
  return null;
}

@Injectable()
export class ChallengeService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  private async requireOwnedCreator(
    creatorId: string | null,
    requestedCreatorId: string,
  ): Promise<void> {
    if (!creatorId || creatorId !== requestedCreatorId) {
      throw new ForbiddenException({
        error: {
          code: "CREATOR_OWNERSHIP_REQUIRED",
          message: "An active owner creator profile is required",
        },
      });
    }
    const creator = await this.database.creator.findUnique({
      where: { id: creatorId },
      select: { status: true },
    });
    if (!creator || creator.status !== "ACTIVE") {
      throw new ForbiddenException({
        error: {
          code: "CREATOR_INACTIVE",
          message: "The creator profile is not active",
        },
      });
    }
  }

  private toView(challenge: {
    id: string;
    creatorId: string;
    title: string;
    description: string;
    status: keyof typeof statusMap;
    submissionKind: string;
    verificationMode: string;
    requiresWorldVerification: boolean;
    startsAt: Date;
    submissionDeadline: Date;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    rewardRule: { amount: string; maxWinners: number } | null;
    _count: { reservations: number };
  }) {
    return {
      id: challenge.id,
      creatorId: challenge.creatorId,
      title: challenge.title,
      description: challenge.description,
      status: statusMap[challenge.status],
      submissionKind: challenge.submissionKind.toLowerCase(),
      verificationMode: challenge.verificationMode.toLowerCase(),
      requiresWorldVerification: challenge.requiresWorldVerification,
      rewardAmount: challenge.rewardRule?.amount ?? "0",
      maxWinners: challenge.rewardRule?.maxWinners ?? 0,
      winnerCount: challenge._count.reservations,
      startsAt: challenge.startsAt.toISOString(),
      submissionDeadline: challenge.submissionDeadline.toISOString(),
      version: challenge.version,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
    };
  }

  private challengeInclude() {
    return {
      rewardRule: true,
      _count: { select: { reservations: true } },
    } as const;
  }

  async create(creatorId: string | null, input: CreateChallengeDto) {
    await this.requireOwnedCreator(creatorId, input.creatorId);
    assertBudget(input.rewardAmount, input.maxWinners);
    if (new Date(input.submissionDeadline) <= new Date()) {
      throw new UnprocessableEntityException({
        error: {
          code: "INVALID_CHALLENGE_DATES",
          message: "Submission deadline must be in the future",
        },
      });
    }
    const challenge = await this.database.challenge.create({
      data: {
        creatorId: input.creatorId,
        title: input.title,
        description: input.description,
        submissionKind: input.submissionKind.toUpperCase() as
          "LINK" | "VIDEO" | "IMAGE" | "TEXT",
        verificationMode: "MANUAL",
        startsAt: new Date(input.startsAt),
        submissionDeadline: new Date(input.submissionDeadline),
        requiresWorldVerification: input.requiresWorldVerification,
        rewardRule: {
          create: { amount: input.rewardAmount, maxWinners: input.maxWinners },
        },
      },
      include: this.challengeInclude(),
    });
    return this.toView(challenge);
  }

  async updateDraft(
    challengeId: string,
    creatorId: string | null,
    input: UpdateChallengeDto,
  ) {
    const updated = await this.database.$transaction(async (transaction) => {
      const current = await transaction.challenge.findUnique({
        where: { id: challengeId },
        include: this.challengeInclude(),
      });
      if (!current) throw new NotFoundException();
      await this.requireOwnedCreator(creatorId, current.creatorId);
      if (current.status !== "DRAFT") {
        throw conflict(
          "CHALLENGE_NOT_DRAFT",
          "Only draft challenges can be edited",
        );
      }
      if (current.version !== input.expectedVersion) {
        throw conflict(
          "VERSION_CONFLICT",
          "The challenge was changed by another request",
        );
      }
      const startsAt = input.startsAt
        ? new Date(input.startsAt)
        : current.startsAt;
      const deadline = input.submissionDeadline
        ? new Date(input.submissionDeadline)
        : current.submissionDeadline;
      if (startsAt >= deadline || deadline <= new Date()) {
        throw new UnprocessableEntityException({
          error: {
            code: "INVALID_CHALLENGE_DATES",
            message: "Challenge dates are invalid",
          },
        });
      }
      const amount = input.rewardAmount ?? current.rewardRule?.amount ?? "0";
      const maxWinners =
        input.maxWinners ?? current.rewardRule?.maxWinners ?? 1;
      assertBudget(amount, maxWinners);
      const updateResult = await transaction.challenge.updateMany({
        where: {
          id: current.id,
          status: "DRAFT",
          version: input.expectedVersion,
        },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          startsAt,
          submissionDeadline: deadline,
          ...(input.requiresWorldVerification !== undefined
            ? { requiresWorldVerification: input.requiresWorldVerification }
            : {}),
          version: { increment: 1 },
        },
      });
      if (updateResult.count !== 1) {
        throw conflict(
          "VERSION_CONFLICT",
          "The challenge was changed by another request",
        );
      }
      await transaction.rewardRule.update({
        where: { challengeId: current.id },
        data: { amount, maxWinners },
      });
      return transaction.challenge.findUniqueOrThrow({
        where: { id: current.id },
        include: this.challengeInclude(),
      });
    });
    return this.toView(updated);
  }

  async publish(challengeId: string, creatorId: string | null) {
    const published = await this.database.$transaction(async (transaction) => {
      const current = await transaction.challenge.findUnique({
        where: { id: challengeId },
        include: this.challengeInclude(),
      });
      if (!current) throw new NotFoundException();
      await this.requireOwnedCreator(creatorId, current.creatorId);
      if (current.status !== "DRAFT") {
        throw conflict(
          "INVALID_CHALLENGE_TRANSITION",
          "Challenge is not a draft",
        );
      }
      if (
        current.submissionDeadline <= new Date() ||
        !current.rewardRule ||
        BigInt(current.rewardRule.amount) <= 0n
      ) {
        throw conflict(
          "CHALLENGE_NOT_PUBLISHABLE",
          "Challenge configuration is incomplete",
        );
      }
      assertBudget(current.rewardRule.amount, current.rewardRule.maxWinners);
      const updateResult = await transaction.challenge.updateMany({
        where: {
          id: current.id,
          status: "DRAFT",
          version: current.version,
        },
        data: { status: "PUBLISHED", version: { increment: 1 } },
      });
      if (updateResult.count !== 1) {
        throw conflict(
          "VERSION_CONFLICT",
          "The challenge was changed by another request",
        );
      }
      const challenge = await transaction.challenge.findUniqueOrThrow({
        where: { id: current.id },
        include: this.challengeInclude(),
      });
      await transaction.outboxEvent.create({
        data: {
          idempotencyKey: `challenge-published:${challenge.id}`,
          eventType: "HCS_CHALLENGE_PUBLISHED",
          aggregateId: challenge.id,
          payload: {
            challengeId: challenge.id,
            creatorId: challenge.creatorId,
            rewardAmount: current.rewardRule.amount,
          },
        },
      });
      return challenge;
    });
    return this.toView(published);
  }

  async transition(
    challengeId: string,
    creatorId: string | null,
    action: ChallengeAction,
  ) {
    const challenge = await this.database.$transaction(async (transaction) => {
      const current = await transaction.challenge.findUnique({
        where: { id: challengeId },
        include: this.challengeInclude(),
      });
      if (!current) throw new NotFoundException();
      await this.requireOwnedCreator(creatorId, current.creatorId);
      const target = challengeTransitionTarget(current.status, action);
      if (!target) {
        throw conflict(
          "INVALID_CHALLENGE_TRANSITION",
          `Challenge cannot ${action} from its current state`,
        );
      }
      if (action === "complete") {
        const undecided = await transaction.submission.count({
          where: { challengeId, status: "SUBMITTED" },
        });
        if (undecided > 0) {
          throw conflict(
            "SUBMISSIONS_PENDING",
            "All submissions must be reviewed first",
          );
        }
      }
      const updateResult = await transaction.challenge.updateMany({
        where: {
          id: challengeId,
          status: current.status,
          version: current.version,
        },
        data: { status: target, version: { increment: 1 } },
      });
      if (updateResult.count !== 1) {
        throw conflict(
          "VERSION_CONFLICT",
          "The challenge was changed by another request",
        );
      }
      return transaction.challenge.findUniqueOrThrow({
        where: { id: challengeId },
        include: this.challengeInclude(),
      });
    });
    return this.toView(challenge);
  }

  async getPublic(challengeId: string) {
    const challenge = await this.database.challenge.findFirst({
      where: {
        id: challengeId,
        status: { in: ["PUBLISHED", "JUDGING", "COMPLETED"] },
      },
      include: this.challengeInclude(),
    });
    return challenge ? this.toView(challenge) : null;
  }

  async listPublic(query: ListChallengesQuery) {
    const statuses = query.status
      ? [query.status.toUpperCase() as "PUBLISHED" | "JUDGING" | "COMPLETED"]
      : (["PUBLISHED", "JUDGING", "COMPLETED"] as const);
    const rows = await this.database.challenge.findMany({
      where: {
        ...(query.creatorId ? { creatorId: query.creatorId } : {}),
        status: { in: [...statuses] },
      },
      include: this.challengeInclude(),
      orderBy: { id: "asc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: items.map((row) => this.toView(row)),
      pageInfo: {
        hasNextPage: hasMore,
        nextCursor: hasMore ? items.at(-1)?.id : undefined,
      },
    };
  }
}
