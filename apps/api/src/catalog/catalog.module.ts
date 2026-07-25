import { Module } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { CatalogController } from "./catalog.controller.js";
import { CatalogService } from "./catalog.service.js";

@Module({
  controllers: [CatalogController],
  providers: [DatabaseService, CatalogService],
})
export class CatalogModule {}
