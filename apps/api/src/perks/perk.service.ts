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
  CreatePerkDto,
  ListPerksQuery,
  UpdatePerkDto,
} from "./perk.schemas.js";

function conflict(code: string, message: string): ConflictException {
  return new ConflictException({ error: { code, message } });
}

export type PerkAction = "activate" | "pause" | "resume";

export function perkTransitionTarget(
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXHAUSTED",
  action: PerkAction,
): "ACTIVE" | "PAUSED" | null {
  if (action === "activate" && status === "DRAFT") return "ACTIVE";
  if (action === "pause" && status === "ACTIVE") return "PAUSED";
  if (action === "resume" && status === "PAUSED") return "ACTIVE";
  return null;
}

@Injectable()
export class PerkService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
  ) {}

  private toView(perk: {
    id: string;
    creatorId: string;
    title: string;
    description: string;
    tokenThreshold: string;
    inventory: number;
    claimedCount: number;
    status: string;
    requiresWorldVerification: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: perk.id,
      creatorId: perk.creatorId,
      title: perk.title,
      description: perk.description,
      tokenThreshold: perk.tokenThreshold,
      inventory: perk.inventory,
      claimedCount: perk.claimedCount,
      status: perk.status.toLowerCase(),
      requiresWorldVerification: perk.requiresWorldVerification,
      version: perk.version,
      createdAt: perk.createdAt.toISOString(),
      updatedAt: perk.updatedAt.toISOString(),
    };
  }

  private async requireOwnedCreator(
    userId: string,
    creatorId: string,
  ): Promise<void> {
    const creator = await this.database.creator.findUnique({
      where: { id: creatorId },
      select: { ownerUserId: true, status: true },
    });
    if (!creator || creator.ownerUserId !== userId) {
      throw new ForbiddenException({
        error: {
          code: "CREATOR_OWNERSHIP_REQUIRED",
          message: "Only the creator owner can manage this perk",
        },
      });
    }
    if (creator.status !== "ACTIVE") {
      throw new ForbiddenException({
        error: {
          code: "CREATOR_INACTIVE",
          message: "The creator profile is not active",
        },
      });
    }
  }

  async create(userId: string, input: CreatePerkDto) {
    await this.requireOwnedCreator(userId, input.creatorId);
    const perk = await this.database.perk.create({ data: input });
    return this.toView(perk);
  }

  async updateDraft(perkId: string, userId: string, input: UpdatePerkDto) {
    const current = await this.database.perk.findUnique({
      where: { id: perkId },
    });
    if (!current) throw new NotFoundException();
    await this.requireOwnedCreator(userId, current.creatorId);
    if (current.status !== "DRAFT") {
      throw conflict("PERK_NOT_DRAFT", "Only draft perks can be edited");
    }
    const inventory = input.inventory ?? current.inventory;
    if (inventory < current.claimedCount) {
      throw new UnprocessableEntityException({
        error: {
          code: "INVENTORY_BELOW_CLAIMS",
          message: "Inventory cannot be lower than the existing claim count",
        },
      });
    }
    const result = await this.database.perk.updateMany({
      where: {
        id: perkId,
        status: "DRAFT",
        version: input.expectedVersion,
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.tokenThreshold !== undefined
          ? { tokenThreshold: input.tokenThreshold }
          : {}),
        ...(input.inventory !== undefined
          ? { inventory: input.inventory }
          : {}),
        ...(input.requiresWorldVerification !== undefined
          ? { requiresWorldVerification: input.requiresWorldVerification }
          : {}),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw conflict(
        "VERSION_CONFLICT",
        "The perk was changed by another request",
      );
    }
    return this.toView(
      await this.database.perk.findUniqueOrThrow({ where: { id: perkId } }),
    );
  }

  async transition(
    perkId: string,
    userId: string,
    action: PerkAction,
    expectedVersion: number,
  ) {
    return this.database.$transaction(async (transaction) => {
      const current = await transaction.perk.findUnique({
        where: { id: perkId },
        include: { creator: { include: { token: true } } },
      });
      if (!current) throw new NotFoundException();
      await this.requireOwnedCreator(userId, current.creatorId);
      const target = perkTransitionTarget(current.status, action);
      if (!target) {
        throw conflict(
          "INVALID_PERK_TRANSITION",
          `Perk cannot ${action} from its current state`,
        );
      }
      if (target === "ACTIVE") {
        const token = current.creator.token;
        if (
          !token?.hederaTokenId ||
          token.status !== "ACTIVE" ||
          BigInt(current.tokenThreshold) > BigInt(token.totalSupply)
        ) {
          throw new UnprocessableEntityException({
            error: {
              code: "CREATOR_TOKEN_NOT_ACTIVE",
              message:
                "An active creator token with sufficient supply is required",
            },
          });
        }
      }
      const update = await transaction.perk.updateMany({
        where: {
          id: perkId,
          status: current.status,
          version: expectedVersion,
        },
        data: { status: target, version: { increment: 1 } },
      });
      if (update.count !== 1) {
        throw conflict(
          "VERSION_CONFLICT",
          "The perk was changed by another request",
        );
      }
      const perk = await transaction.perk.findUniqueOrThrow({
        where: { id: perkId },
      });
      if (action === "activate") {
        const publicPayload = {
          perkId: perk.id,
          creatorId: perk.creatorId,
          tokenThreshold: perk.tokenThreshold,
          inventory: perk.inventory,
        };
        await transaction.auditEvent.create({
          data: {
            eventType: "PerkActivated",
            entityId: perk.id,
            actorId: userId,
            payload: publicPayload,
            publicPayload,
          },
        });
        await transaction.outboxEvent.create({
          data: {
            idempotencyKey: `perk-activated:${perk.id}`,
            eventType: "HCS_PERK_ACTIVATED",
            aggregateId: perk.id,
            payload: publicPayload,
          },
        });
      }
      return this.toView(perk);
    });
  }

  async getPublic(perkId: string) {
    const perk = await this.database.perk.findFirst({
      where: { id: perkId, status: { not: "DRAFT" } },
    });
    return perk ? this.toView(perk) : null;
  }

  async listPublic(creatorId: string, query: ListPerksQuery) {
    const rows = await this.database.perk.findMany({
      where: {
        creatorId,
        status: query.status
          ? (query.status.toUpperCase() as "ACTIVE" | "PAUSED" | "EXHAUSTED")
          : { in: ["ACTIVE", "PAUSED", "EXHAUSTED"] },
      },
      orderBy: { id: "asc" },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: items.map((perk) => this.toView(perk)),
      pageInfo: {
        hasNextPage: hasMore,
        nextCursor: hasMore ? items.at(-1)?.id : undefined,
      },
    };
  }
}
