import { Module } from "@nestjs/common";
import {
  HederaWalletSignatureVerifier,
  MirrorNodeClient,
} from "@creator-platform/hedera";
import { DatabaseService } from "../database/database.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import {
  WALLET_SIGNATURE_VERIFIER,
  type WalletSignatureVerifier,
} from "./auth.types.js";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  controllers: [AuthController],
  providers: [
    DatabaseService,
    AuthService,
    {
      provide: WALLET_SIGNATURE_VERIFIER,
      useFactory: (): WalletSignatureVerifier => {
        const mirrorNode = new MirrorNodeClient({
          mirrorNodeUrl:
            process.env.HEDERA_MIRROR_NODE_URL ??
            "https://testnet.mirrornode.hedera.com",
          mirrorRequestTimeoutMs: positiveInteger(
            process.env.HEDERA_MIRROR_REQUEST_TIMEOUT_MS,
            10_000,
          ),
          mirrorVerificationTimeoutMs: 0,
          mirrorPollIntervalMs: 750,
          mirrorMaxAttempts: positiveInteger(
            process.env.HEDERA_MIRROR_MAX_ATTEMPTS,
            4,
          ),
        });
        return new HederaWalletSignatureVerifier(mirrorNode);
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
