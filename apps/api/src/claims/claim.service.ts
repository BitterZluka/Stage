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
import type {
  CreateClaimDto,
  FulfillClaimDto,
  ListClaimsQuery,
} from "./claim.schemas.js";
import {
  TOKEN_BALANCE_READER,
  type TokenBalanceReader,
} from "../token-balances/token-balance-reader.js";

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ error: { code, message } });
}

@Injectable()
export class ClaimService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(TOKEN_BALANCE_READER)
    private readonly balances: TokenBalanceReader,
  ) {}

  private toView(claim: {
    id: string;
    perkId: string;
    claimantId: string;
    status: string;
    fulfillmentNote: string | null;
    fulfilledAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: claim.id,
      perkId: claim.perkId,
      claimantId: claim.claimantId,
      status: claim.status.toLowerCase(),
      ...(claim.fulfillmentNote
        ? { fulfillmentNote: claim.fulfillmentNote }
        : {}),
      ...(claim.fulfilledAt
        ? { fulfilledAt: claim.fulfilledAt.toISOString() }
        : {}),
      version: claim.version,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
    };
  }

  async create(perkId: string, userId: string, input: CreateClaimDto) {
    const existing = await this.database.claim.findUnique({
      where: { perkId_claimantId: { perkId, claimantId: userId } },
    });
    if (existing) return this.toView(existing);

    const perk = await this.database.perk.findUnique({
      where: { id: perkId },
      include: { creator: { include: { token: true } } },
    });
    if (!perk) throw new NotFoundException();
    if (perk.status !== "ACTIVE") {
      throw conflict("PERK_NOT_ACTIVE", "This perk is not open for claims");
    }
    const token = perk.creator.token;
    if (!token?.hederaTokenId || token.status !== "ACTIVE") {
      throw new UnprocessableEntityException({
        error: {
          code: "CREATOR_TOKEN_NOT_ACTIVE",
          message: "The creator token is not active",
        },
      });
    }
    const wallets = await this.database.wallet.findMany({
      where: { userId },
      orderBy: { verifiedAt: "desc" },
      select: { accountId: true },
    });
    const accountId =
      input.accountId ??
      wallets.find((wallet) => /^0\.0\.\d+$/.test(wallet.accountId))?.accountId;
    if (
      !accountId ||
      !wallets.some((wallet) => wallet.accountId === accountId)
    ) {
      throw new ForbiddenException({
        error: {
          code: "WALLET_NOT_LINKED",
          message: "The selected Hedera account is not linked to this user",
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
    if (balance.balance < BigInt(perk.tokenThreshold)) {
      throw new ForbiddenException({
        error: {
          code: "TOKEN_BALANCE_INSUFFICIENT",
          message: "The linked account does not meet the token threshold",
        },
      });
    }

    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe(
        'SELECT "id" FROM "Perk" WHERE "id" = $1 FOR UPDATE',
        perkId,
      );
      const duplicate = await transaction.claim.findUnique({
        where: { perkId_claimantId: { perkId, claimantId: userId } },
      });
      if (duplicate) return this.toView(duplicate);
      const current = await transaction.perk.findUnique({
        where: { id: perkId },
      });
      if (!current) throw new NotFoundException();
      if (current.status !== "ACTIVE") {
        throw conflict("PERK_NOT_ACTIVE", "This perk is not open for claims");
      }
      if (current.claimedCount >= current.inventory) {
        throw conflict("PERK_OUT_OF_STOCK", "The perk inventory is exhausted");
      }
      if (current.requiresWorldVerification) {
        const identity = await transaction.worldIdentity.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (!identity) {
          throw new UnprocessableEntityException({
            error: {
              code: "WORLD_VERIFICATION_REQUIRED",
              message: "World Selfie Check is required to claim this perk",
            },
          });
        }
      }
      const claim = await transaction.claim.create({
        data: {
          perkId,
          claimantId: userId,
          eligibilitySnapshot: {
            accountId,
            tokenId: token.hederaTokenId,
            balance: balance.balance.toString(),
            tokenThreshold: current.tokenThreshold,
            checkedAt: new Date().toISOString(),
          },
        },
      });
      const claimedCount = current.claimedCount + 1;
      await transaction.perk.update({
        where: { id: perkId },
        data: {
          claimedCount,
          status:
            claimedCount >= current.inventory ? "EXHAUSTED" : current.status,
          version: { increment: 1 },
        },
      });
      await transaction.auditEvent.create({
        data: {
          eventType: "PerkClaimed",
          entityId: claim.id,
          actorId: userId,
          payload: { claimId: claim.id, perkId, claimantId: userId },
        },
      });
      return this.toView(claim);
    });
  }

  async listOwn(userId: string, query: ListClaimsQuery) {
    return this.list(
      {
        claimantId: userId,
        ...(query.status
          ? {
              status: query.status.toUpperCase() as
                "CLAIMED" | "FULFILLED" | "CANCELLED",
            }
          : {}),
      },
      query,
    );
  }

  async listForCreator(perkId: string, userId: string, query: ListClaimsQuery) {
    const perk = await this.database.perk.findUnique({
      where: { id: perkId },
      include: { creator: { select: { ownerUserId: true } } },
    });
    if (!perk) throw new NotFoundException();
    if (perk.creator.ownerUserId !== userId) throw new ForbiddenException();
    return this.list(
      {
        perkId,
        ...(query.status
          ? {
              status: query.status.toUpperCase() as
                "CLAIMED" | "FULFILLED" | "CANCELLED",
            }
          : {}),
      },
      query,
    );
  }

  private async list(
    where: {
      claimantId?: string;
      perkId?: string;
      status?: "CLAIMED" | "FULFILLED" | "CANCELLED";
    },
    query: ListClaimsQuery,
  ) {
    const rows = await this.database.claim.findMany({
      where,
      orderBy: { id: "asc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: items.map((claim) => this.toView(claim)),
      pageInfo: {
        hasNextPage: hasMore,
        nextCursor: hasMore ? items.at(-1)?.id : undefined,
      },
    };
  }

  async get(claimId: string, userId: string) {
    const claim = await this.database.claim.findUnique({
      where: { id: claimId },
      include: { perk: { include: { creator: true } } },
    });
    if (!claim) return null;
    if (
      claim.claimantId !== userId &&
      claim.perk.creator.ownerUserId !== userId
    ) {
      throw new ForbiddenException();
    }
    return this.toView(claim);
  }

  async fulfill(claimId: string, userId: string, input: FulfillClaimDto) {
    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe(
        'SELECT "id" FROM "Claim" WHERE "id" = $1 FOR UPDATE',
        claimId,
      );
      const claim = await transaction.claim.findUnique({
        where: { id: claimId },
        include: { perk: { include: { creator: true } } },
      });
      if (!claim) throw new NotFoundException();
      if (claim.perk.creator.ownerUserId !== userId) {
        throw new ForbiddenException({
          error: {
            code: "CREATOR_OWNERSHIP_REQUIRED",
            message: "Only the perk creator can fulfill this claim",
          },
        });
      }
      if (claim.status !== "CLAIMED") {
        throw conflict("CLAIM_ALREADY_FINAL", "This claim is already final");
      }
      if (claim.version !== input.expectedVersion) {
        throw conflict(
          "VERSION_CONFLICT",
          "The claim was changed by another request",
        );
      }
      const fulfilled = await transaction.claim.update({
        where: { id: claim.id },
        data: {
          status: "FULFILLED",
          ...(input.note !== undefined ? { fulfillmentNote: input.note } : {}),
          fulfilledAt: new Date(),
          version: { increment: 1 },
        },
      });
      const publicPayload = {
        claimId: claim.id,
        perkId: claim.perkId,
        creatorId: claim.perk.creatorId,
      };
      await transaction.auditEvent.create({
        data: {
          eventType: "PerkClaimFulfilled",
          entityId: claim.id,
          actorId: userId,
          payload: { ...publicPayload, fulfillmentNote: input.note ?? null },
          publicPayload,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          idempotencyKey: `perk-fulfilled:${claim.id}`,
          eventType: "HCS_PERK_FULFILLED",
          aggregateId: claim.id,
          payload: publicPayload,
        },
      });
      return this.toView(fulfilled);
    });
  }
}
