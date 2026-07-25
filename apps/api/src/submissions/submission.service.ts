import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import {
  TOKEN_BALANCE_READER,
  type TokenBalanceReader,
} from "../token-balances/token-balance-reader.js";
import {
  CHALLENGE_VERIFIER,
  type ChallengeVerifier,
} from "./challenge-verifier.js";
import type {
  CreateSubmissionDto,
  ListSubmissionsQuery,
  SubmissionDecisionDto,
} from "./submission.schemas.js";

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ error: { code, message } });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function payoutStatus(
  status: string,
): "pending" | "requested" | "confirmed" | "failed" {
  if (status === "PROCESSING" || status === "SUBMITTED") return "requested";
  if (status === "CONFIRMED") return "confirmed";
  if (status === "FAILED" || status === "NEEDS_REVIEW") return "failed";
  return "pending";
}

export function meetsParticipationTokenRequirement(
  requiredAmount: string,
  balance: bigint,
): boolean {
  return balance >= BigInt(requiredAmount);
}

@Injectable()
export class SubmissionService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(CHALLENGE_VERIFIER)
    private readonly verifier: ChallengeVerifier,
    @Inject(TOKEN_BALANCE_READER)
    private readonly balances: TokenBalanceReader,
  ) {}

  private toView(submission: {
    id: string;
    challengeId: string;
    authorUserId: string;
    status: string;
    text: string | null;
    artifactRefs: unknown;
    reviewNote: string | null;
    reviewedAt: Date | null;
    version: number;
    createdAt: Date;
  }) {
    const artifacts =
      typeof submission.artifactRefs === "object" &&
      submission.artifactRefs !== null
        ? (submission.artifactRefs as { evidenceUrl?: unknown })
        : {};
    return {
      id: submission.id,
      challengeId: submission.challengeId,
      authorId: submission.authorUserId,
      status: submission.status.toLowerCase(),
      ...(submission.text ? { text: submission.text } : {}),
      ...(typeof artifacts.evidenceUrl === "string"
        ? { evidenceUrl: artifacts.evidenceUrl }
        : {}),
      ...(submission.reviewNote ? { reviewNote: submission.reviewNote } : {}),
      ...(submission.reviewedAt
        ? { reviewedAt: submission.reviewedAt.toISOString() }
        : {}),
      version: submission.version,
      createdAt: submission.createdAt.toISOString(),
      updatedAt:
        submission.reviewedAt?.toISOString() ??
        submission.createdAt.toISOString(),
    };
  }

  async create(
    challengeId: string,
    authorUserId: string,
    input: CreateSubmissionDto,
  ) {
    const challenge = await this.database.challenge.findUnique({
      where: { id: challengeId },
      include: { creator: { include: { token: true } } },
    });
    if (!challenge) throw new NotFoundException();
    const now = new Date();
    if (
      challenge.status !== "PUBLISHED" ||
      now < challenge.startsAt ||
      now > challenge.submissionDeadline
    ) {
      throw conflict(
        "CHALLENGE_NOT_ACCEPTING_SUBMISSIONS",
        "This challenge is not accepting submissions",
      );
    }
    if (challenge.submissionKind === "TEXT" && !input.text) {
      throw new UnprocessableEntityException({
        error: {
          code: "TEXT_EVIDENCE_REQUIRED",
          message: "This challenge requires text evidence",
        },
      });
    }
    if (challenge.submissionKind !== "TEXT" && !input.evidenceUrl) {
      throw new UnprocessableEntityException({
        error: {
          code: "URL_EVIDENCE_REQUIRED",
          message: "This challenge requires a public evidence URL",
        },
      });
    }
    if (BigInt(challenge.participationTokenAmount) > 0n) {
      const token = challenge.creator.token;
      if (!token?.hederaTokenId || token.status !== "ACTIVE") {
        throw new UnprocessableEntityException({
          error: {
            code: "CREATOR_TOKEN_NOT_ACTIVE",
            message: "The creator token is not active",
          },
        });
      }
      const wallets = await this.database.wallet.findMany({
        where: { userId: authorUserId },
        orderBy: { verifiedAt: "desc" },
        select: { accountId: true },
      });
      const accountId = wallets.find((wallet) =>
        /^0\.0\.\d+$/.test(wallet.accountId),
      )?.accountId;
      if (!accountId) {
        throw new ForbiddenException({
          error: {
            code: "HEDERA_WALLET_REQUIRED",
            message:
              "A linked Hedera account is required for this token-gated challenge",
          },
        });
      }
      let balance: Awaited<ReturnType<TokenBalanceReader["getTokenBalance"]>>;
      try {
        balance = await this.balances.getTokenBalance(
          accountId,
          token.hederaTokenId,
        );
      } catch {
        throw new ServiceUnavailableException({
          error: {
            code: "MIRROR_NODE_UNAVAILABLE",
            message: "Token eligibility could not be checked",
          },
        });
      }
      if (!balance.associated) {
        throw conflict(
          "TOKEN_NOT_ASSOCIATED",
          "Associate the creator token with your Hedera account first",
        );
      }
      if (
        !meetsParticipationTokenRequirement(
          challenge.participationTokenAmount,
          balance.balance,
        )
      ) {
        throw new ForbiddenException({
          error: {
            code: "TOKEN_BALANCE_INSUFFICIENT",
            message:
              "Your linked account does not meet this challenge's token requirement",
          },
        });
      }
    }
    const verification = await this.verifier.verify({
      submissionKind: challenge.submissionKind,
      ...(input.evidenceUrl ? { evidenceUrl: input.evidenceUrl } : {}),
      ...(input.text ? { text: input.text } : {}),
      config: challenge.verificationConfig,
    });
    if (verification.outcome === "FAIL") {
      throw new UnprocessableEntityException({
        error: {
          code: "EVIDENCE_VERIFICATION_FAILED",
          message: verification.reason ?? "Evidence verification failed",
        },
      });
    }
    try {
      const submission = await this.database.$transaction(
        async (transaction) => {
          const created = await transaction.submission.create({
            data: {
              challengeId,
              authorUserId,
              ...(input.text ? { text: input.text } : {}),
              ...(input.evidenceUrl
                ? { artifactRefs: { evidenceUrl: input.evidenceUrl } }
                : {}),
            },
          });
          await transaction.auditEvent.create({
            data: {
              eventType: "SubmissionCreated",
              entityId: created.id,
              actorId: authorUserId,
              payload: { submissionId: created.id, challengeId, authorUserId },
            },
          });
          return created;
        },
      );
      return this.toView(submission);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(
          "SUBMISSION_ALREADY_EXISTS",
          "Only one submission per user and challenge is allowed",
        );
      }
      throw error;
    }
  }

  async listForCreator(
    challengeId: string,
    creatorId: string | null,
    query: ListSubmissionsQuery,
  ) {
    const challenge = await this.database.challenge.findUnique({
      where: { id: challengeId },
      select: { creatorId: true },
    });
    if (!challenge) throw new NotFoundException();
    if (!creatorId || creatorId !== challenge.creatorId) {
      throw new ForbiddenException({
        error: {
          code: "CREATOR_OWNERSHIP_REQUIRED",
          message: "Only the challenge creator can review submissions",
        },
      });
    }
    const rows = await this.database.submission.findMany({
      where: {
        challengeId,
        ...(query.status
          ? {
              status: query.status.toUpperCase() as
                "SUBMITTED" | "WINNER" | "REJECTED",
            }
          : {}),
      },
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

  async get(submissionId: string, userId: string, creatorId: string | null) {
    const submission = await this.database.submission.findUnique({
      where: { id: submissionId },
      include: { challenge: { select: { creatorId: true } } },
    });
    if (!submission) return null;
    if (
      submission.authorUserId !== userId &&
      submission.challenge.creatorId !== creatorId
    ) {
      throw new ForbiddenException();
    }
    return this.toView(submission);
  }

  async decide(
    submissionId: string,
    creatorId: string | null,
    input: SubmissionDecisionDto,
  ) {
    if (!creatorId) {
      throw new ForbiddenException({
        error: {
          code: "CREATOR_PROFILE_REQUIRED",
          message: "A creator profile is required",
        },
      });
    }
    try {
      return await this.database.$transaction(async (transaction) => {
        await transaction.$queryRawUnsafe(
          'SELECT "id" FROM "Submission" WHERE "id" = $1 FOR UPDATE',
          submissionId,
        );
        const submission = await transaction.submission.findUnique({
          where: { id: submissionId },
          include: {
            challenge: { include: { rewardRule: true } },
          },
        });
        if (!submission) throw new NotFoundException();
        if (submission.challenge.creatorId !== creatorId) {
          throw new ForbiddenException({
            error: {
              code: "CREATOR_OWNERSHIP_REQUIRED",
              message: "Only the challenge creator can decide this submission",
            },
          });
        }
        if (submission.status !== "SUBMITTED") {
          throw conflict(
            "SUBMISSION_ALREADY_DECIDED",
            "This submission already has a final decision",
          );
        }
        if (submission.version !== input.expectedVersion) {
          throw conflict(
            "VERSION_CONFLICT",
            "The submission was changed by another request",
          );
        }
        if (submission.challenge.status !== "JUDGING") {
          throw conflict(
            "CHALLENGE_NOT_IN_JUDGING",
            "Submissions can only be decided during judging",
          );
        }
        const reviewedAt = new Date();
        if (input.decision === "reject") {
          const reviewNote = input.note
            ? `${input.reasonCode}: ${input.note}`
            : input.reasonCode;
          const rejected = await transaction.submission.update({
            where: { id: submission.id },
            data: {
              status: "REJECTED",
              reviewNote,
              reviewedAt,
              version: { increment: 1 },
            },
          });
          await transaction.auditEvent.create({
            data: {
              eventType: "SubmissionRejected",
              entityId: submission.id,
              actorId: creatorId,
              payload: {
                submissionId: submission.id,
                challengeId: submission.challengeId,
                reasonCode: input.reasonCode,
              },
            },
          });
          return { submission: this.toView(rejected), payout: null };
        }

        await transaction.$queryRawUnsafe(
          'SELECT "id" FROM "Challenge" WHERE "id" = $1 FOR UPDATE',
          submission.challengeId,
        );
        const rewardRule = submission.challenge.rewardRule;
        if (!rewardRule) {
          throw conflict(
            "REWARD_POLICY_MISSING",
            "The challenge does not have a reward policy",
          );
        }
        const reservationCount = await transaction.rewardReservation.count({
          where: { challengeId: submission.challengeId },
        });
        if (reservationCount >= rewardRule.maxWinners) {
          throw conflict(
            "WINNER_LIMIT_REACHED",
            "All reward slots have already been reserved",
          );
        }

        if (submission.challenge.requiresWorldVerification) {
          const identity = await transaction.worldIdentity.findUnique({
            where: { userId: submission.authorUserId },
            select: { id: true },
          });
          if (!identity) {
            throw new UnprocessableEntityException({
              error: {
                code: "WORLD_VERIFICATION_REQUIRED",
                message: "The winner must complete World Selfie Check first",
              },
            });
          }
          await transaction.worldRewardClaim.create({
            data: {
              worldIdentityId: identity.id,
              challengeId: submission.challengeId,
              rewardType: "CHALLENGE_WINNER",
            },
          });
        }

        const reservation = await transaction.rewardReservation.create({
          data: {
            challengeId: submission.challengeId,
            submissionId: submission.id,
            recipientId: submission.authorUserId,
            amount: rewardRule.amount,
          },
        });
        const payout = await transaction.rewardPayout.create({
          data: {
            reservationId: reservation.id,
            recipientId: submission.authorUserId,
            amount: rewardRule.amount,
          },
        });
        const winner = await transaction.submission.update({
          where: { id: submission.id },
          data: {
            status: "WINNER",
            reviewedAt,
            version: { increment: 1 },
          },
        });
        await transaction.outboxEvent.create({
          data: {
            idempotencyKey: `challenge-reward:${submission.id}`,
            eventType: "CHALLENGE_REWARD_REQUESTED",
            aggregateId: payout.id,
            payload: {
              payoutId: payout.id,
              challengeId: submission.challengeId,
              submissionId: submission.id,
            },
          },
        });
        await transaction.auditEvent.create({
          data: {
            eventType: "WinnerSelected",
            entityId: submission.id,
            actorId: creatorId,
            payload: {
              challengeId: submission.challengeId,
              submissionId: submission.id,
              winnerId: submission.authorUserId,
              payoutId: payout.id,
            },
          },
        });
        return {
          submission: this.toView(winner),
          payout: {
            id: payout.id,
            submissionId: submission.id,
            challengeId: submission.challengeId,
            recipientId: payout.recipientId,
            amount: payout.amount,
            status: "pending",
            requestedAt: payout.requestedAt.toISOString(),
          },
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict(
          "REWARD_ALREADY_RESERVED",
          "A reward has already been reserved for this submission or identity",
        );
      }
      throw error;
    }
  }

  async getPayout(
    submissionId: string,
    userId: string,
    creatorId: string | null,
  ) {
    const payout = await this.database.rewardPayout.findFirst({
      where: { reservation: { submissionId } },
      include: {
        reservation: {
          include: { challenge: { select: { creatorId: true } } },
        },
      },
    });
    if (!payout) return null;
    if (
      payout.recipientId !== userId &&
      payout.reservation.challenge.creatorId !== creatorId
    ) {
      throw new ForbiddenException();
    }
    return {
      id: payout.id,
      challengeId: payout.reservation.challengeId,
      submissionId: payout.reservation.submissionId,
      recipientId: payout.recipientId,
      amount: payout.amount,
      status: payoutStatus(payout.status),
      transactionId: payout.transactionId ?? undefined,
      requestedAt: payout.requestedAt.toISOString(),
      confirmedAt: payout.confirmedAt?.toISOString(),
    };
  }
}
