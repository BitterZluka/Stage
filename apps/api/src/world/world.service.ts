import { Inject, Injectable } from "@nestjs/common";
import type { WorldProvider } from "@stage/world/server";
import type {
  WorldRpContextResponse,
  WorldVerificationStatus,
} from "@stage/world/shared";
import { buildStageWorldSignal } from "@stage/world/shared";
import type { WorldServerConfig } from "@stage/world/server";
import type {
  AuthenticatedWorldUser,
  WorldIdentityRepository,
} from "./world.types.js";
import {
  WORLD_CONFIG,
  WORLD_IDENTITY_REPOSITORY,
  WORLD_PROVIDER,
} from "./world.types.js";

function selectWallet(
  user: AuthenticatedWorldUser,
  requestedAccountId?: string,
): string {
  if (user.accountIds.length === 0) {
    throw new Error("A verified Hedera wallet is required");
  }
  if (requestedAccountId) {
    if (!user.accountIds.includes(requestedAccountId)) {
      throw new Error(
        "The requested Hedera wallet is not linked to this Stage account",
      );
    }
    return requestedAccountId;
  }
  return [...user.accountIds].sort()[0]!;
}

@Injectable()
export class WorldService {
  constructor(
    @Inject(WORLD_PROVIDER)
    private readonly provider: WorldProvider,
    @Inject(WORLD_CONFIG)
    private readonly config: WorldServerConfig,
    @Inject(WORLD_IDENTITY_REPOSITORY)
    private readonly repository: WorldIdentityRepository,
  ) {}

  async createRpContext(
    user: AuthenticatedWorldUser,
    hederaAccountId?: string,
  ): Promise<WorldRpContextResponse> {
    const accountId = selectWallet(user, hederaAccountId);
    const signal = buildStageWorldSignal({
      userId: user.id,
      hederaAccountId: accountId,
    });
    return {
      appId: this.config.appId,
      action: this.config.action,
      signal,
      environment: this.config.environment,
      provider: this.config.provider,
      rpContext: await this.provider.createRpContext({
        action: this.config.action,
      }),
    };
  }

  async verify(
    user: AuthenticatedWorldUser,
    proof: unknown,
    hederaAccountId?: string,
  ): Promise<WorldVerificationStatus> {
    const accountId = selectWallet(user, hederaAccountId);
    const signal = buildStageWorldSignal({
      userId: user.id,
      hederaAccountId: accountId,
    });
    const verification = await this.provider.verifyProof({
      proof,
      expectedAction: this.config.action,
      expectedSignal: signal,
    });
    return this.repository.persistVerification({
      userId: user.id,
      provider: this.config.provider,
      action: this.config.action,
      signalHash: signal,
      verification,
    });
  }

  getStatus(user: AuthenticatedWorldUser): Promise<WorldVerificationStatus> {
    return this.repository.getStatus(user.id);
  }
}
