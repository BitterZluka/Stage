import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseService } from "../database/database.service.js";
import { PerkController } from "./perk.controller.js";
import { PerkService } from "./perk.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PerkController],
  providers: [DatabaseService, PerkService],
})
export class PerkModule {}
