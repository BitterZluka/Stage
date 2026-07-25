import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ChallengeModule } from "./challenges/challenge.module.js";
import { SubmissionModule } from "./submissions/submission.module.js";
import { ClaimModule } from "./claims/claim.module.js";
import { PerkModule } from "./perks/perk.module.js";
import { WorldModule } from "./world/world.module.js";

@Controller("health")
class HealthController {
  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}

@Module({
  imports: [
    AuthModule,
    WorldModule,
    ChallengeModule,
    SubmissionModule,
    PerkModule,
    ClaimModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
