import { Module } from "@nestjs/common";
import {
  MirrorTokenBalanceReader,
  TOKEN_BALANCE_READER,
} from "./token-balance-reader.js";
import {
  MirrorTokenPaymentReader,
  TOKEN_PAYMENT_READER,
} from "./token-payment-reader.js";

@Module({
  providers: [
    MirrorTokenBalanceReader,
    MirrorTokenPaymentReader,
    {
      provide: TOKEN_BALANCE_READER,
      useExisting: MirrorTokenBalanceReader,
    },
    {
      provide: TOKEN_PAYMENT_READER,
      useExisting: MirrorTokenPaymentReader,
    },
  ],
  exports: [TOKEN_BALANCE_READER, TOKEN_PAYMENT_READER],
})
export class TokenBalanceModule {}
