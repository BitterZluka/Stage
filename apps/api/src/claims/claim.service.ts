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
  ConfirmPerkPurchaseDto,
  CreatePerkPurchaseDto,
  FulfillClaimDto,
  ListClaimsQuery,
} from "./claim.schemas.js";
import {
  TOKEN_BALANCE_READER,
  type TokenBalanceReader,
} from "../token-balances/token-balance-reader.js";
import {
  TOKEN_PAYMENT_READER,
  type TokenPaymentReader,
} from "../token-balances/token-payment-reader.js";

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
    @Inject(TOKEN_PAYMENT_READER)
    private readonly payments: TokenPaymentReader,
  ) {}

  private toView(
    claim: {
      id: string;
      perkId: string;
      claimantId: string;
      status: string;
      fulfillmentNote: string | null;
      fulfilledAt: Date | null;
      version: number;
      createdAt: Date;
      updatedAt: Date;
      perk?: {
        title: string;
        description: string;
        creator: {
          displayName: string;
          handle: string;
          token?: { symbol: string } | null;
        };
      };
      purchase?: {
        id: string;
        status: string;
        accountId: string;
        tokenId: string;
        destinationAccountId: string;
        amount: string;
        transactionReference: string | null;
        consensusTimestamp: string | null;
      } | null;
    },
    includePayment = false,
  ) {
    const confirmedPayment =
      includePayment &&
      claim.purchase?.status === "CONFIRMED" &&
      claim.purchase.transactionReference &&
      claim.purchase.consensusTimestamp
        ? {
            purchaseId: claim.purchase.id,
            tokenId: claim.purchase.tokenId,
            amount: claim.purchase.amount,
            payerAccountId: claim.purchase.accountId,
            destinationAccountId: claim.purchase.destinationAccountId,
            transactionReference: claim.purchase.transactionReference,
            consensusTimestamp: claim.purchase.consensusTimestamp,
          }
        : undefined;

    return {
      id: claim.id,
      perkId: claim.perkId,
      claimantId: claim.claimantId,
      status: claim.status.toLowerCase(),
      ...(claim.perk
        ? {
            perk: {
              title: claim.perk.title,
              description: claim.perk.description,
              creatorName: claim.perk.creator.displayName,
              creatorHandle: claim.perk.creator.handle,
              tokenSymbol: claim.perk.creator.token?.symbol ?? "TOKEN",
            },
          }
        : {}),
      ...(claim.fulfillmentNote
        ? { fulfillmentNote: claim.fulfillmentNote }
        : {}),
      ...(claim.fulfilledAt
        ? { fulfilledAt: claim.fulfilledAt.toISOString() }
        : {}),
      version: claim.version,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      ...(confirmedPayment ? { payment: confirmedPayment } : {}),
    };
  }

  private toPurchaseView(purchase: {
    id: string;
    perkId: string;
    status: string;
    accountId: string;
    tokenId: string;
    destinationAccountId: string;
    amount: string;
    expiresAt: Date;
    transactionReference: string | null;
    consensusTimestamp: string | null;
    claimId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: purchase.id,
      perkId: purchase.perkId,
      status: purchase.status.toLowerCase(),
      accountId: purchase.accountId,
      tokenId: purchase.tokenId,
      destinationAccountId: purchase.destinationAccountId,
      amount: purchase.amount,
      expiresAt: purchase.expiresAt.toISOString(),
      ...(purchase.transactionReference
        ? { transactionReference: purchase.transactionReference }
        : {}),
      ...(purchase.consensusTimestamp
        ? { consensusTimestamp: purchase.consensusTimestamp }
        : {}),
      ...(purchase.claimId ? { claimId: purchase.claimId } : {}),
      createdAt: purchase.createdAt.toISOString(),
      updatedAt: purchase.updatedAt.toISOString(),
    };
  }

  private async requirePurchaseEligibility(
    perkId: string,
    userId: string,
    input: CreatePerkPurchaseDto,
  ) {
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
          message: "The linked account does not have enough tokens",
        },
      });
    }
    if (perk.requiresWorldVerification) {
      const identity = await this.database.worldIdentity.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!identity) {
        throw new UnprocessableEntityException({
          error: {
            code: "WORLD_VERIFICATION_REQUIRED",
            message: "World Selfie Check is required to purchase this perk",
          },
        });
      }
    }
    const destinationAccountId = process.env.HEDERA_TREASURY_ACCOUNT_ID;
    if (!destinationAccountId || !/^0\.0\.\d+$/.test(destinationAccountId)) {
      throw new ServiceUnavailableException({
        error: {
          code: "PERK_PAYMENTS_NOT_CONFIGURED",
          message: "The perk payment treasury is not configured",
        },
      });
    }
    return {
      accountId,
      tokenId: token.hederaTokenId,
      destinationAccountId,
      amount: perk.tokenThreshold,
    };
  }

  async createPurchaseIntent(
    perkId: string,
    userId: string,
    input: CreatePerkPurchaseDto,
  ) {
    const payment = await this.requirePurchaseEligibility(
      perkId,
      userId,
      input,
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60_000);
    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe(
        'SELECT "id" FROM "Perk" WHERE "id" = $1 FOR UPDATE',
        perkId,
      );
      const existingClaim = await transaction.claim.findUnique({
        where: { perkId_claimantId: { perkId, claimantId: userId } },
      });
      if (existingClaim) {
        throw conflict(
          "PERK_ALREADY_PURCHASED",
          "You have already purchased this perk",
        );
      }
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
      const existing = await transaction.perkPurchase.findUnique({
        where: { perkId_buyerId: { perkId, buyerId: userId } },
      });
      if (
        existing?.status === "PENDING" &&
        existing.expiresAt.getTime() > now.getTime()
      ) {
        return this.toPurchaseView(existing);
      }
      if (existing?.status === "CONFIRMED") {
        return this.toPurchaseView(existing);
      }
      const activeReservations = await transaction.perkPurchase.count({
        where: {
          perkId,
          status: "PENDING",
          expiresAt: { gt: now },
          ...(existing ? { id: { not: existing.id } } : {}),
        },
      });
      if (current.claimedCount + activeReservations >= current.inventory) {
        throw conflict(
          "PERK_OUT_OF_STOCK",
          "All remaining perk inventory is reserved",
        );
      }
      const purchase = existing
        ? await transaction.perkPurchase.update({
            where: { id: existing.id },
            data: {
              ...payment,
              status: "PENDING",
              transactionReference: null,
              consensusTimestamp: null,
              claimId: null,
              confirmedAt: null,
              expiresAt,
            },
          })
        : await transaction.perkPurchase.create({
            data: {
              perkId,
              buyerId: userId,
              ...payment,
              expiresAt,
            },
          });
      return this.toPurchaseView(purchase);
    });
  }

  async confirmPurchase(
    purchaseId: string,
    userId: string,
    input: ConfirmPerkPurchaseDto,
  ) {
    const purchase = await this.database.perkPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new NotFoundException();
    if (purchase.buyerId !== userId) throw new ForbiddenException();
    if (purchase.status === "CONFIRMED" && purchase.claimId) {
      const claim = await this.database.claim.findUnique({
        where: { id: purchase.claimId },
      });
      if (claim) return this.toView(claim);
    }
    if (purchase.status !== "PENDING") {
      throw conflict(
        "PERK_PURCHASE_NOT_PENDING",
        "This perk purchase is no longer pending",
      );
    }

    let verification: Awaited<ReturnType<TokenPaymentReader["verify"]>>;
    try {
      verification = await this.payments.verify({
        transactionReference: input.transactionReference,
        payerAccountId: purchase.accountId,
        destinationAccountId: purchase.destinationAccountId,
        tokenId: purchase.tokenId,
        amount: purchase.amount,
      });
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: "MIRROR_NODE_UNAVAILABLE",
          message: "The Hedera payment could not be checked",
        },
      });
    }
    if (verification.status === "pending") {
      throw conflict(
        "PAYMENT_NOT_INDEXED",
        "The payment is still waiting for Hedera Mirror Node",
      );
    }
    if (verification.status === "invalid") {
      throw new UnprocessableEntityException({
        error: {
          code: "PAYMENT_INVALID",
          message: verification.reason,
        },
      });
    }

    return this.database.$transaction(async (transaction) => {
      await transaction.$queryRawUnsafe(
        'SELECT "id" FROM "PerkPurchase" WHERE "id" = $1 FOR UPDATE',
        purchaseId,
      );
      const currentPurchase = await transaction.perkPurchase.findUnique({
        where: { id: purchaseId },
      });
      if (!currentPurchase) throw new NotFoundException();
      if (currentPurchase.status === "CONFIRMED" && currentPurchase.claimId) {
        const existing = await transaction.claim.findUnique({
          where: { id: currentPurchase.claimId },
        });
        if (existing) return this.toView(existing);
      }
      if (currentPurchase.status !== "PENDING") {
        throw conflict(
          "PERK_PURCHASE_NOT_PENDING",
          "This perk purchase is no longer pending",
        );
      }
      const usedPayment = await transaction.perkPurchase.findFirst({
        where: {
          transactionReference: input.transactionReference,
          id: { not: purchaseId },
        },
        select: { id: true },
      });
      if (usedPayment) {
        throw conflict(
          "PAYMENT_ALREADY_USED",
          "This Hedera payment has already been used",
        );
      }
      await transaction.$queryRawUnsafe(
        'SELECT "id" FROM "Perk" WHERE "id" = $1 FOR UPDATE',
        currentPurchase.perkId,
      );
      const current = await transaction.perk.findUnique({
        where: { id: currentPurchase.perkId },
      });
      if (!current) throw new NotFoundException();
      if (current.claimedCount >= current.inventory) {
        // TODO: Queue an idempotent treasury refund when a confirmed payment
        // arrives after its inventory reservation has been superseded.
        throw conflict(
          "PAYMENT_RECONCILIATION_REQUIRED",
          "The payment succeeded but inventory changed; support must reconcile this purchase",
        );
      }
      const claim = await transaction.claim.create({
        data: {
          perkId: currentPurchase.perkId,
          claimantId: userId,
          eligibilitySnapshot: {
            accountId: currentPurchase.accountId,
            tokenId: currentPurchase.tokenId,
            paymentAmount: currentPurchase.amount,
            destinationAccountId: currentPurchase.destinationAccountId,
            transactionReference: input.transactionReference,
            consensusTimestamp: verification.consensusTimestamp,
          },
        },
      });
      const claimedCount = current.claimedCount + 1;
      await transaction.perk.update({
        where: { id: current.id },
        data: {
          claimedCount,
          status:
            claimedCount >= current.inventory ? "EXHAUSTED" : current.status,
          version: { increment: 1 },
        },
      });
      await transaction.perkPurchase.update({
        where: { id: purchaseId },
        data: {
          status: "CONFIRMED",
          transactionReference: input.transactionReference,
          consensusTimestamp: verification.consensusTimestamp,
          claimId: claim.id,
          confirmedAt: new Date(),
        },
      });
      const publicPayload = {
        purchaseId,
        perkId: current.id,
        claimId: claim.id,
        tokenId: currentPurchase.tokenId,
        amount: currentPurchase.amount,
        transactionId: input.transactionReference,
      };
      await transaction.auditEvent.create({
        data: {
          eventType: "PerkPurchased",
          entityId: claim.id,
          actorId: userId,
          payload: {
            ...publicPayload,
            payerAccountId: currentPurchase.accountId,
            destinationAccountId: currentPurchase.destinationAccountId,
          },
          publicPayload,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          idempotencyKey: `perk-purchased:${purchaseId}`,
          eventType: "HCS_PERK_PURCHASED",
          aggregateId: purchaseId,
          payload: publicPayload,
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
      true,
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
    includePayment = false,
  ) {
    const rows = await this.database.claim.findMany({
      where,
      include: {
        perk: {
          include: {
            creator: {
              include: { token: true },
            },
          },
        },
        purchase: true,
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: items.map((claim) => this.toView(claim, includePayment)),
      pageInfo: {
        hasNextPage: hasMore,
        nextCursor: hasMore ? items.at(-1)?.id : undefined,
      },
    };
  }

  async get(claimId: string, userId: string) {
    const claim = await this.database.claim.findUnique({
      where: { id: claimId },
      include: {
        perk: {
          include: {
            creator: {
              include: { token: true },
            },
          },
        },
        purchase: true,
      },
    });
    if (!claim) return null;
    if (
      claim.claimantId !== userId &&
      claim.perk.creator.ownerUserId !== userId
    ) {
      throw new ForbiddenException();
    }
    return this.toView(claim, claim.claimantId === userId);
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
