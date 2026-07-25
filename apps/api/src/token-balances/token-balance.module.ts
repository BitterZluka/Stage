import { Module } from "@nestjs/common";
import {
  MirrorTokenBalanceReader,
  TOKEN_BALANCE_READER,
} from "./token-balance-reader.js";

@Module({
  providers: [
    MirrorTokenBalanceReader,
    {
      provide: TOKEN_BALANCE_READER,
      useExisting: MirrorTokenBalanceReader,
    },
  ],
  exports: [TOKEN_BALANCE_READER],
})
export class TokenBalanceModule {}
