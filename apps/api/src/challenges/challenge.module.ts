import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseService } from "../database/database.service.js";
import { ChallengeController } from "./challenge.controller.js";
import { ChallengeService } from "./challenge.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ChallengeController],
  providers: [DatabaseService, ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
