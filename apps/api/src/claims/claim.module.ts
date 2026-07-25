import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseService } from "../database/database.service.js";
import { TokenBalanceModule } from "../token-balances/token-balance.module.js";
import { ClaimController } from "./claim.controller.js";
import { ClaimService } from "./claim.service.js";

@Module({
  imports: [AuthModule, TokenBalanceModule],
  controllers: [ClaimController],
  providers: [DatabaseService, ClaimService],
})
export class ClaimModule {}
