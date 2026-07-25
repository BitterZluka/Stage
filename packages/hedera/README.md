# Stage Hedera integration

`@creator-platform/hedera` is the server-side Hedera Testnet adapter for Stage.
It uses native Hedera services only:

- HTS fungible creator rewards;
- HTS non-fungible claim collections;
- HCS public audit events;
- Hedera Mirror Node REST verification;
- no Solidity and no smart contracts.

PostgreSQL remains the product source of truth. Normal application writes flow
from `apps/api` through the transactional outbox to `apps/worker`; the worker
calls the JSON-safe `SdkHederaProvider`. Database and Hedera writes are never
treated as one atomic transaction.

The lower-level `StageHedera` service exposes the complete package API and
accepts `bigint` token quantities. `SdkHederaProvider` translates the shared
cross-boundary decimal-string contracts into that service without exposing SDK
clients, keys, transactions, or receipts.

## Structure

```text
packages/hedera/
├── src/
│   ├── client.ts
│   ├── config.ts
│   ├── errors.ts
│   ├── idempotency.ts
│   ├── mirror-node.ts
│   ├── mock-provider.ts
│   ├── sdk-hedera-provider.ts
│   ├── stage-hedera.ts
│   ├── transaction-executor.ts
│   ├── types.ts
│   ├── utils.ts
│   └── wallet-association.ts
├── scripts/testnet/
├── test/
├── .env.example
└── package.json
```

## Install and verify

From the repository root:

```bash
pnpm install
cp packages/hedera/.env.example packages/hedera/.env
pnpm --filter @creator-platform/hedera test
pnpm --filter @creator-platform/hedera lint
pnpm --filter @creator-platform/hedera typecheck
pnpm --filter @creator-platform/hedera build
```

The `.env` file and `.stage-hedera/` runtime state are ignored. Never commit,
print, snapshot, or pass a private key through an API/job payload. Production
deployments should use a managed secret store. The JSON file idempotency store
is for sequential scripts only; worker deployments must inject a transactional,
durable implementation.

## Configuration

Required for the complete sequential flow:

```text
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ACCOUNT_ID
HEDERA_OPERATOR_PRIVATE_KEY
HEDERA_TREASURY_ACCOUNT_ID
HEDERA_TREASURY_PRIVATE_KEY
HEDERA_SUPPLY_PRIVATE_KEY
HEDERA_HCS_SUBMIT_PRIVATE_KEY
HEDERA_HCS_ADMIN_PRIVATE_KEY        # optional unless an admin key is requested
HEDERA_MIRROR_NODE_URL
HEDERA_EXPLORER_BASE_URL
HEDERA_REQUEST_TIMEOUT_MS
HEDERA_RECEIPT_TIMEOUT_MS
HEDERA_MAX_ATTEMPTS
HEDERA_MIRROR_REQUEST_TIMEOUT_MS
HEDERA_MIRROR_VERIFICATION_TIMEOUT_MS
HEDERA_MIRROR_POLL_INTERVAL_MS
HEDERA_MIRROR_MAX_ATTEMPTS
HEDERA_MAX_TRANSACTION_FEE_HBAR
HEDERA_MAX_QUERY_PAYMENT_HBAR
```

The treasury account/key may fall back to the operator only when the treasury
account is omitted or is the operator account. This development convenience is
explicit; separate operator, treasury, supply, HCS submit, and HCS admin keys
are preferred. Only Testnet is accepted.

`loadStageHederaConfig()` validates required values, Hedera account IDs, private
keys, URLs, and numeric limits. Validation errors name fields but never echo key
material.

## Backend construction

```ts
import {
  InMemoryIdempotencyStore,
  SdkHederaProvider,
  StageHedera,
  loadStageHederaConfig,
} from "@creator-platform/hedera";

const config = loadStageHederaConfig();

// Use only for a single-process demo or tests. The worker must inject a
// transactional database-backed IdempotencyStore.
const idempotencyStore = new InMemoryIdempotencyStore();

const hedera = new StageHedera({ config, idempotencyStore });
const provider = new SdkHederaProvider(hedera);

try {
  // Use hedera.* for the complete API or provider.* for the shared JSON-safe port.
} finally {
  provider.close();
}
```

## Fungible reward API

Amounts are exact `bigint` values in the token's smallest unit. For a token
with two decimals, `2_500n` means `25.00` tokens. Never use floating-point
arithmetic for token quantities.

```ts
const created = await hedera.createFungibleToken({
  idempotencyKey: "creator-token:creator_42:v1",
  name: "Stage Creator Credit",
  symbol: "STAGEC",
  decimals: 2,
  initialSupply: 0n,
  supplyType: "INFINITE",
  supplyKey: "configured",
  memo: "Stage creator rewards v1",
});

const minted = await hedera.mintFungibleToken({
  idempotencyKey: "credit-mint:payout_batch_7:v1",
  tokenId: created.tokenId,
  amount: 100_000n,
});

const burned = await hedera.burnFungibleToken({
  idempotencyKey: "credit-burn:adjustment_9:v1",
  tokenId: created.tokenId,
  amount: 500n,
});

const reward = await hedera.transferFungibleToken({
  idempotencyKey: "reward:reward_17:v1",
  tokenId: created.tokenId,
  toAccountId: "0.0.<recipient>",
  amount: 2_500n,
});

const token = await hedera.getTokenInfo(created.tokenId);
const balance = await hedera.getTokenBalance("0.0.<account>", created.tokenId);
const associated = await hedera.isTokenAssociated(
  "0.0.<account>",
  created.tokenId,
);
```

The recipient must associate a fungible HTS token before receiving it.
Association is checked using the account-token relationship endpoint, so an
associated account with a zero balance is still correctly reported as
associated. `transferFungibleToken()` rejects an unassociated recipient with
`TOKEN_NOT_ASSOCIATED` before submission. The platform API can debit only the
configured treasury.

## User-wallet association

Production association is prepared by the package and signed/submitted by the
user's wallet:

```ts
const prepared = await hedera.prepareTokenAssociationTransaction({
  accountId: "0.0.<user>",
  tokenIds: ["0.0.<token>"],
});

// Browser/wallet boundary:
// const transaction = Transaction.fromBytes(
//   Buffer.from(prepared.transactionBytesBase64, "base64"),
// );
// Pass the transaction to the selected Hedera wallet integration.
```

The prepared transaction has the user account as both association account and
payer. The backend never requests or accepts the user's private key. After the
wallet submits, the backend verifies the returned transaction ID with
`getTransaction()` and confirms the relationship with `isTokenAssociated()`.

`04b-associate-with-test-wallet.ts` is a clearly isolated Testnet demonstration
that reads `STAGE_USER_PRIVATE_KEY`. It must never be copied into production
request handling.

## NFT API

NFT work follows the verified fungible reward flow:

```ts
const collection = await hedera.createNftCollection({
  idempotencyKey: "claim-collection:creator_42:v1",
  name: "Stage Claim",
  symbol: "STGCLM",
  maxSupply: 10_000n,
  supplyKey: "configured",
});

const mint = await hedera.mintNft({
  idempotencyKey: "claim-mint:claim_91:v1",
  tokenId: collection.tokenId,
  metadata: { name: "Stage Claim", type: "perk" },
});

const owner = await hedera.getNftOwner(
  collection.tokenId,
  mint.serialNumbers[0]!,
);

const transfer = await hedera.transferNft({
  idempotencyKey: "claim-transfer:claim_91:v1",
  tokenId: collection.tokenId,
  serialNumber: mint.serialNumbers[0]!,
  toAccountId: "0.0.<recipient>",
});

const burn = await hedera.burnNft({
  idempotencyKey: "claim-burn:claim_91:v1",
  tokenId: collection.tokenId,
  serialNumbers: [mint.serialNumbers[0]!],
});
```

HTS NFT metadata is limited to 100 encoded bytes. Store larger public content
elsewhere and use a public URI/CID or hash. NFT burn requires every requested
serial to exist and be owned by the configured treasury; the package verifies
that through Mirror Node before creating the burn transaction.

## HCS API

Stage publishes only the shared `ethglobal.audit` schema. It accepts public
facts and identifiers, requires an explicit stable `occurredAt`, serializes
keys deterministically, limits one event to 1,024 bytes, and rejects field names
associated with PII, World proofs/nullifiers, shipping, submission content,
secrets, JWTs, or private/signed URLs.

```ts
const topic = await hedera.createTopic({
  idempotencyKey: "audit-topic:deployment_testnet_1:v1",
  memo: "Stage audit events v1",
  adminKey: "none",
  submitKey: "configured",
});

const published = await hedera.publishAuditEvent({
  idempotencyKey: "audit:event_123:v1",
  topicId: topic.topicId,
  event: {
    schema: "ethglobal.audit",
    version: 1,
    eventId: "event_123",
    eventType: "reward_paid",
    occurredAt: "2026-07-25T12:00:00.000Z",
    transactionId: reward.transactionId,
    publicData: { rewardId: "reward_17" },
  },
});

const page = await hedera.getTopicMessages({
  topicId: topic.topicId,
  order: "asc",
  limit: 25,
});

const nextPage = page.next
  ? await hedera.getTopicMessages({ topicId: topic.topicId, next: page.next })
  : null;
```

Mirror messages are base64-decoded and runtime-validated. Invalid external
messages remain visible with `event: null` and `validationError`; they are not
silently trusted as Stage audit events.

## Transaction lookup

```ts
const transaction = await hedera.getTransaction(reward.transactionId);
```

The normalized Mirror view includes result, consensus timestamp, charged fee,
memo, entity ID, HBAR transfers, token transfers, NFT transfers, scheduled
state, and valid-start timestamp. SDK transaction IDs are normalized to Mirror
REST path format.

## Write results and errors

Every platform write returns the same core shape:

```ts
{
  transactionId: "<actual Testnet transaction ID>",
  receiptStatus: "SUCCESS",
  consensusTimestamp: "<Mirror consensus timestamp when indexed>",
  explorerUrl: "https://hashscan.io/testnet/transaction/<actual transaction ID>",
  status: "success",
  mirrorVerified: true,
  replayed: false
}
```

These are placeholders, not fabricated successful transactions. The scripts
print actual IDs and statuses returned with the maintainer's credentials.

```ts
try {
  await hedera.transferFungibleToken(input);
} catch (error) {
  if (error instanceof StageHederaError) {
    console.error({
      code: error.code,
      operation: error.operation,
      transactionId: error.transactionId,
      receiptStatus: error.receiptStatus,
      retryable: error.retryable,
    });
  }
}
```

Errors distinguish configuration/input failures, insufficient balance, token
association, invalid signatures, receipt failures, Mirror failures, network
failures, idempotency conflict, and indeterminate outcomes. Serialized errors
omit causes so key/configuration objects cannot leak through normal output.

## Idempotency and ambiguous outcomes

Every platform write requires a stable business key. Recommended formats:

```text
creator-token:{creatorId}:v1
credit-mint:{payoutBatchId}:v1
reward:{rewardId}:v1
claim-collection:{creatorId}:v1
claim-mint:{claimId}:v1
claim-transfer:{claimId}:v1
claim-burn:{claimId}:v1
audit:{eventId}:v1
audit-topic:{deploymentId}:v1
```

Before submission, the executor freezes and signs the transaction, then stores
the canonical payload hash, transaction ID, and exact signed transaction bytes.
The same key and payload replays a completed result with `replayed: true`. A
changed payload returns `IDEMPOTENCY_CONFLICT`.

After an ambiguous timeout, the record becomes indeterminate and the package
returns `IDEMPOTENCY_INDETERMINATE` with the original transaction ID. It never
silently creates a replacement mint, transfer, token, NFT, topic, burn, or HCS
message. The worker must reconcile the original ID through Mirror Node/receipt
status and the operation ledger before any policy-authorized resubmission.

Mirror verification after a successful consensus receipt is best-effort because
Mirror indexing is eventually consistent. An unavailable or not-yet-indexed
Mirror record yields `mirrorVerified: false`; it does not turn an authoritative
successful receipt into a failure.

## Signing responsibilities

| Operation                    | Signer                                                 |
| ---------------------------- | ------------------------------------------------------ |
| Fungible/NFT token creation  | Platform operator/payer and configured treasury        |
| Fungible/NFT mint            | Configured supply key                                  |
| Eligible fungible/NFT burn   | Configured treasury and supply keys                    |
| Treasury reward/NFT transfer | Configured treasury key                                |
| HCS topic creation           | Platform operator; optional configured admin authority |
| HCS message publication      | Configured submit key                                  |
| User token association       | User wallet                                            |
| Any transfer debiting a user | User wallet, outside the platform write API            |

## Sequential Testnet flow

Run only after populating `packages/hedera/.env`:

```bash
pnpm --filter @creator-platform/hedera testnet:balance
pnpm --filter @creator-platform/hedera testnet:create-ft

STAGE_MINT_ID=initial-supply \
STAGE_MINT_AMOUNT=100000 \
pnpm --filter @creator-platform/hedera testnet:mint-ft

STAGE_USER_ACCOUNT_ID=0.0.<user> \
pnpm --filter @creator-platform/hedera testnet:prepare-association

# Testnet-only alternative:
STAGE_USER_ACCOUNT_ID=0.0.<user> \
STAGE_USER_PRIVATE_KEY='<testnet-user-key>' \
pnpm --filter @creator-platform/hedera testnet:associate-test-wallet

STAGE_REWARD_ID=reward_17 \
STAGE_RECIPIENT_ACCOUNT_ID=0.0.<user> \
STAGE_TRANSFER_AMOUNT=2500 \
pnpm --filter @creator-platform/hedera testnet:transfer-ft

pnpm --filter @creator-platform/hedera testnet:verify-ft
pnpm --filter @creator-platform/hedera testnet:create-topic

STAGE_AUDIT_EVENT_ID=event_123 \
STAGE_AUDIT_OCCURRED_AT=2026-07-25T12:00:00.000Z \
pnpm --filter @creator-platform/hedera testnet:publish-audit

pnpm --filter @creator-platform/hedera testnet:read-audit
pnpm --filter @creator-platform/hedera testnet:create-nft

STAGE_NFT_MINT_ID=claim_91 \
pnpm --filter @creator-platform/hedera testnet:mint-nft

STAGE_NFT_SERIAL_TO_BURN=1 \
pnpm --filter @creator-platform/hedera testnet:burn-nft
```

Scripts write only IDs and non-secret state to the ignored
`.stage-hedera/testnet-state.json` and idempotency files. They exit non-zero on
failure and do not claim a live transaction occurred when credentials are
absent.
