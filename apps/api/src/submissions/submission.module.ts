import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseService } from "../database/database.service.js";
import {
  CHALLENGE_VERIFIER,
  ManualChallengeVerifier,
} from "./challenge-verifier.js";
import { SubmissionController } from "./submission.controller.js";
import { SubmissionService } from "./submission.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SubmissionController],
  providers: [
    DatabaseService,
    SubmissionService,
    ManualChallengeVerifier,
    {
      provide: CHALLENGE_VERIFIER,
      useExisting: ManualChallengeVerifier,
    },
  ],
})
export class SubmissionModule {}
