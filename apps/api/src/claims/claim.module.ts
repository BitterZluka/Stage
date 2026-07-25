import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseService } from "../database/database.service.js";
import { ClaimController } from "./claim.controller.js";
import { ClaimService } from "./claim.service.js";
import {
  MirrorTokenBalanceReader,
  TOKEN_BALANCE_READER,
} from "./token-balance-reader.js";

@Module({
  imports: [AuthModule],
  controllers: [ClaimController],
  providers: [
    DatabaseService,
    ClaimService,
    MirrorTokenBalanceReader,
    {
      provide: TOKEN_BALANCE_READER,
      useExisting: MirrorTokenBalanceReader,
    },
  ],
})
export class ClaimModule {}
