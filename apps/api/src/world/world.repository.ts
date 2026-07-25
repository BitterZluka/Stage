import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@creator-platform/database";
import { WorldProviderError, worldError } from "@stage/world/server";
import type {
  WorldCredentialType,
  WorldProviderName,
  WorldVerificationStatus,
} from "@stage/world/shared";
import { DatabaseService } from "../database/database.service.js";
import type {
  PersistWorldVerificationInput,
  WorldIdentityRepository,
} from "./world.types.js";

function credentialType(value: string): WorldCredentialType {
  if (value === "selfie_check" || value === "proof_of_human") return value;
  return "unknown";
}

function providerName(value: string): WorldProviderName | undefined {
  return value === "real" || value === "fake" ? value : undefined;
}

function status(
  identity: {
    credentialType: string;
    verifiedAt: Date;
    provider: string;
  } | null,
): WorldVerificationStatus {
  if (!identity) return { verified: false };
  const provider = providerName(identity.provider);
  return {
    verified: true,
    credentialType: credentialType(identity.credentialType),
    verifiedAt: identity.verifiedAt.toISOString(),
    ...(provider ? { provider } : {}),
  };
}

@Injectable()
export class PrismaWorldIdentityRepository implements WorldIdentityRepository {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  async getStatus(userId: string): Promise<WorldVerificationStatus> {
    return status(
      await this.database.worldIdentity.findUnique({ where: { userId } }),
    );
  }

  async persistVerification(
    input: PersistWorldVerificationInput,
  ): Promise<WorldVerificationStatus> {
    try {
      const identity = await this.database.$transaction(async (transaction) => {
        const [existingIdentity, existingReplay] = await Promise.all([
          transaction.worldIdentity.findUnique({
            where: { userId: input.userId },
          }),
          transaction.worldProofReplay.findUnique({
            where: {
              action_replayKey: {
                action: input.action,
                replayKey: input.verification.replayKey,
              },
            },
          }),
        ]);

        if (existingReplay) {
          if (
            existingIdentity &&
            existingReplay.worldIdentityId === existingIdentity.id
          ) {
            return existingIdentity;
          }
          throw worldError(
            "PROOF_REPLAYED",
            "This World proof is linked to another Stage account",
          );
        }

        if (
          existingIdentity?.subjectKey &&
          input.verification.subjectKey &&
          existingIdentity.subjectKey !== input.verification.subjectKey
        ) {
          throw worldError(
            "IDENTITY_CONFLICT",
            "A different World identity is already linked to this Stage account",
          );
        }
        if (
          existingIdentity?.sessionId &&
          input.verification.sessionId &&
          existingIdentity.sessionId !== input.verification.sessionId
        ) {
          throw worldError(
            "IDENTITY_CONFLICT",
            "A different World session is already linked to this Stage account",
          );
        }

        if (existingIdentity) {
          const updated = await transaction.worldIdentity.update({
            where: { id: existingIdentity.id },
            data: {
              provider: input.provider,
              protocolVersion: input.verification.protocolVersion,
              credentialType: input.verification.credentialType,
              signalHash: input.signalHash,
              verifiedAt: new Date(input.verification.verifiedAt),
              ...(input.verification.subjectKey
                ? { subjectKey: input.verification.subjectKey }
                : {}),
              ...(input.verification.sessionId
                ? { sessionId: input.verification.sessionId }
                : {}),
            },
          });
          await transaction.worldProofReplay.create({
            data: {
              worldIdentityId: updated.id,
              action: input.action,
              replayKey: input.verification.replayKey,
              protocolVersion: input.verification.protocolVersion,
              credentialType: input.verification.credentialType,
              acceptedAt: new Date(input.verification.verifiedAt),
            },
          });
          return updated;
        }

        return transaction.worldIdentity.create({
          data: {
            userId: input.userId,
            provider: input.provider,
            protocolVersion: input.verification.protocolVersion,
            credentialType: input.verification.credentialType,
            signalHash: input.signalHash,
            verifiedAt: new Date(input.verification.verifiedAt),
            ...(input.verification.subjectKey
              ? { subjectKey: input.verification.subjectKey }
              : {}),
            ...(input.verification.sessionId
              ? { sessionId: input.verification.sessionId }
              : {}),
            proofReplays: {
              create: {
                action: input.action,
                replayKey: input.verification.replayKey,
                protocolVersion: input.verification.protocolVersion,
                credentialType: input.verification.credentialType,
                acceptedAt: new Date(input.verification.verifiedAt),
              },
            },
          },
        });
      });
      return status(identity);
    } catch (cause) {
      if (cause instanceof WorldProviderError) throw cause;
      if (
        cause instanceof Prisma.PrismaClientKnownRequestError &&
        cause.code === "P2002"
      ) {
        throw worldError(
          "IDENTITY_CONFLICT",
          "World identity or proof is already linked",
        );
      }
      throw cause;
    }
  }

  async assertRewardEligibility(input: {
    userId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ worldIdentityId: string }> {
    const challenge = await this.database.challenge.findUnique({
      where: { id: input.challengeId },
      include: {
        submissions: {
          where: { authorUserId: input.userId },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!challenge) {
      throw worldError("PROVIDER_ERROR", "Challenge was not found");
    }
    if (challenge.submissions.length === 0) {
      throw worldError(
        "IDENTITY_CONFLICT",
        "A valid challenge submission is required",
      );
    }

    const identity = await this.database.worldIdentity.findUnique({
      where: { userId: input.userId },
    });
    if (challenge.requiresWorldVerification && !identity) {
      throw worldError(
        "IDENTITY_CONFLICT",
        "World Selfie Check is required for this reward",
      );
    }
    if (!identity) {
      throw worldError(
        "IDENTITY_CONFLICT",
        "A World identity is required to reserve a World-scoped reward",
      );
    }
    const existing = await this.database.worldRewardClaim.findUnique({
      where: {
        challengeId_worldIdentityId_rewardType: {
          challengeId: input.challengeId,
          worldIdentityId: identity.id,
          rewardType: input.rewardType,
        },
      },
    });
    if (existing) {
      throw worldError(
        "PROOF_REPLAYED",
        "This World identity already claimed this challenge reward",
      );
    }
    return { worldIdentityId: identity.id };
  }

  async reserveRewardClaim(input: {
    worldIdentityId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ id: string; created: boolean }> {
    try {
      const claim = await this.database.worldRewardClaim.create({
        data: input,
      });
      return { id: claim.id, created: true };
    } catch (cause) {
      if (
        cause instanceof Prisma.PrismaClientKnownRequestError &&
        cause.code === "P2002"
      ) {
        const existing = await this.database.worldRewardClaim.findUnique({
          where: {
            challengeId_worldIdentityId_rewardType: input,
          },
        });
        if (existing) return { id: existing.id, created: false };
      }
      throw cause;
    }
  }
}
