import { Module } from "@nestjs/common";
import {
  createWorldProvider,
  loadWorldServerConfig,
  type WorldProvider,
  type WorldServerConfig,
} from "@stage/world/server";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseService } from "../database/database.service.js";
import { WorldController } from "./world.controller.js";
import { WorldEligibilityService } from "./world-eligibility.service.js";
import { PrismaWorldIdentityRepository } from "./world.repository.js";
import { WorldService } from "./world.service.js";
import {
  WORLD_CONFIG,
  WORLD_IDENTITY_REPOSITORY,
  WORLD_PROVIDER,
} from "./world.types.js";

@Module({
  imports: [AuthModule],
  controllers: [WorldController],
  providers: [
    DatabaseService,
    {
      provide: WORLD_CONFIG,
      useFactory: (): WorldServerConfig => loadWorldServerConfig(),
    },
    {
      provide: WORLD_PROVIDER,
      inject: [WORLD_CONFIG],
      useFactory: (config: WorldServerConfig): WorldProvider =>
        createWorldProvider(config),
    },
    {
      provide: WORLD_IDENTITY_REPOSITORY,
      useClass: PrismaWorldIdentityRepository,
    },
    WorldService,
    WorldEligibilityService,
  ],
  exports: [WorldEligibilityService],
})
export class WorldModule {}
