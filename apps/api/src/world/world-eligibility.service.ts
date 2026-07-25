import { Inject, Injectable } from "@nestjs/common";
import type { WorldIdentityRepository } from "./world.types.js";
import { WORLD_IDENTITY_REPOSITORY } from "./world.types.js";

@Injectable()
export class WorldEligibilityService {
  constructor(
    @Inject(WORLD_IDENTITY_REPOSITORY)
    private readonly repository: WorldIdentityRepository,
  ) {}

  assertWorldEligibilityForReward(input: {
    userId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ worldIdentityId: string }> {
    return this.repository.assertRewardEligibility(input);
  }

  reserveWorldRewardClaim(input: {
    worldIdentityId: string;
    challengeId: string;
    rewardType: string;
  }): Promise<{ id: string; created: boolean }> {
    return this.repository.reserveRewardClaim(input);
  }
}
