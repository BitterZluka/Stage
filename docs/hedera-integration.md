# Hedera integration

`@hashgraph/sdk` is used: HTS for creator tokens, HCS for the public audit trail, and Mirror Node REST for eventual reads/reconciliation. Solidity and smart contracts are not used.

## Package boundary

`packages/shared` exports the public `HederaProvider` port, while `packages/hedera` exports:

- `SdkHederaProvider` for Testnet, implementing the shared port;
- `MockHederaProvider` for backend-independent E2E/local development;
- `StageHedera` for the complete HTS/HCS/Mirror API;
- a Mirror reader, canonical HCS serializer, idempotency stores,
  wallet-association preparation, and error classifier.

It does not export SDK `Client`, transaction/receipt/key objects and has no knowledge of Prisma entities. The API/worker pass decimal strings and public IDs. The adapter loads secrets from the runtime secret store.

**Temporary MVP solution:** the API uses the provider only for safe reads/validation. The BullMQ worker initiates all system writes (`TokenCreate`, `Transfer`, `TopicMessageSubmit`) from the transactional outbox.

Creator onboarding reserves the creator-token row and a
`CREATOR_TOKEN_CREATION_REQUESTED` outbox command in one database transaction.
Every subsequent creator login, plus challenge creation and publishing, performs
the same idempotent provisioning check. A local token previously confirmed by
`MockHederaProvider` is requeued with the same operation ID when the server is
switched to `HEDERA_PROVIDER=real`; genuinely confirmed Hedera transactions are
left unchanged.
The worker calls `HederaProvider.createCreatorToken` and activates the token
only after HTS confirms it. Challenge submissions and winner decisions
similarly persist `PARTICIPATION` or `WINNER` reservations before the worker
calls `HederaProvider.transferCredits`. Independent idempotency keys let a
winning participant safely receive both transfers.

## HTS

Creator token MVP:

- fungible common, `decimals=0`;
- treasury — system account;
- fixed initial supply;
- no custom fees or wipe/freeze/KYC/pause keys;
- no admin key after creation; no supply key with fixed supply;
- the memo contains only `operationId`, with no PII.

Before a transfer, the account/token ID format and a positive amount are validated. Recipient token association is a product prerequisite: the UI provides instructions, the API checks Mirror Node, and the worker classifies `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` as action-required rather than endlessly retryable.

When a challenge submission detects a missing relationship, the web app can
build a `TokenAssociateTransaction` and ask the connected Hedera wallet to sign
and execute it. The API still re-checks Mirror Node before accepting the
submission; indexing can require a short retry delay after association.

For MetaMask, the web app resolves the selected EVM address to the authenticated
canonical Hedera account through Mirror Node, then sends the user-signed
HRC-719 `associate()` call (`0x0a754de6`) directly to the HTS token facade.
No platform key or custom smart contract is involved. The API still treats
Mirror Node as the association authority before saving a submission.
After Mirror confirms association, the same user action requests
`wallet_watchAsset` with Mirror-verified symbol and decimals so MetaMask can
display the token. Declining that optional display prompt does not undo or
misreport the already-confirmed association.

## HCS

One MVP audit topic. The message is canonical minified UTF-8 JSON:

```json
{
  "v": 1,
  "eventId": "uuid",
  "type": "reward.transferred.v1",
  "occurredAt": "ISO-8601",
  "aggregate": { "type": "Reward", "id": "uuid" },
  "operationId": "uuid",
  "data": {},
  "hash": "sha256-of-db-event-projection"
}
```

Only the allowlist from `domain-model.md` is included in `data`. The serializer rejects unknown fields, PII tags, and payloads above the selected limit. Large data is not automatically chunked: a hash/anchor is published, while the content remains in the DB/object storage.

The adapter enforces the shared event-type allowlist, requires an explicit UTC
timestamp, recursively rejects sensitive field-name categories, and caps each
canonical event at 1,024 bytes.

HCS order is consensus order, not DB commit order. `eventId` and `occurredAt` preserve domain causality; consumers deduplicate by `eventId`.

## Outbox and idempotency

Minimum records:

```text
outbox(id, operation_id UNIQUE, type, payload_json, status, attempts,
       available_at, locked_at, last_error_code, created_at)
hedera_operations(operation_id PK, kind, request_hash, status,
       transaction_id, consensus_timestamp, result_json, attempts, updated_at)
```

Worker algorithm:

1. Receive the job with `jobId=operationId` and compare `sha256(canonical command)` with `request_hash`.
2. If the operation is `CONFIRMED`, return the stored result.
3. If a `transactionId` exists after a timeout, query the receipt/status and Mirror Node first.
4. Create/sign a new transaction only when the absence of submission has been proven.
5. Store the transaction ID immediately after creation/submission, followed by the receipt.
6. Update the DB aggregate and add the follow-up audit outbox in one transaction.

The same `operationId` with a different request hash produces `IDEMPOTENCY_CONFLICT`, without submission.

## Signer / retry / idempotency matrix

| Operation | Signer / key | Idempotency key | Retry | Ambiguous outcome | Success |
|---|---|---|---|---|---|
| `CREATE_CREATOR_TOKEN` | operator/treasury; no supply key | `creator-token:{creatorId}` | transport, `BUSY`, `PLATFORM_TRANSACTION_NOT_CREATED`: exponential + jitter, max 5 | look up the stored transaction ID; if absent, set `NEEDS_REVIEW` and do not create a second token automatically | receipt `SUCCESS`, store tokenId |
| `MINT_CREATOR_CREDITS` | supply key; only if mintable policy is enabled | `credit-mint:{payoutBatchId}` | transient max 5 | receipt lookup; a new mint is prohibited without proven absence | receipt `SUCCESS`, store new total supply |
| `TRANSFER_REWARD` | treasury account key | `reward:{rewardId}` | transient/precheck congestion max 8; do not retry invalid account/association/insufficient balance | receipt lookup by transaction ID, then Mirror; a new tx may be retried only if submission definitely did not occur | receipt `SUCCESS`, store consensus timestamp |
| `CREATE_CLAIM_COLLECTION` | operator/treasury + supply key | `claim-collection:{creatorId}` | transient max 5 | `NEEDS_REVIEW`; do not create a second token automatically | receipt `SUCCESS`, store tokenId |
| `MINT_CLAIM_NFT` | collection supply key | `claim-mint:{claimId}` | transient max 5 | receipt/Mirror lookup by transaction ID and serial | receipt `SUCCESS`, store serial |
| `TRANSFER_CLAIM_NFT` | current owner/treasury according to stage | `claim-transfer:{claimId}` | transient max 8; association/ownership errors are permanent | receipt lookup, then Mirror owner | receipt `SUCCESS`, store owner |
| `BURN_CLAIM_NFT` | treasury + supply key after fulfillment | `claim-burn:{claimId}` | transient max 5; invalid serial is permanent | receipt lookup; do not submit a repeated burn | receipt `SUCCESS`, claim `REDEEMED` |
| `SUBMIT_AUDIT_EVENT` | topic submit key or operator | `audit:{eventId}` | transient max 10; DLQ is acceptable, do not roll back the business operation | Mirror query by transaction ID/message hash; the consumer suppresses duplicates by eventId | receipt `SUCCESS`, sequence/consensus timestamp eventual |
| `CREATE_AUDIT_TOPIC` | operator/admin key | deployment-scoped constant | explicit deploy command only, max 3 | `NEEDS_REVIEW`; an automatic second topic is prohibited | topicId recorded in config/registry |
| `READ_TOKEN/BALANCE` | no signer | request cache key | 429/5xx with bounded backoff, max 4 | return `DEPENDENCY_UNAVAILABLE`; do not assume a zero balance | Mirror response with freshness metadata |
| `RECONCILE_OPERATION` | no signer; then original signer only according to policy | `reconcile:{operationId}:{attempt}` | scheduled until SLA, then alert | never submit a new tx without the operation policy | local status matches the network |

Retry backoff: 1s, 2s, 4s… with jitter, bounded as specified in each row. `INVALID_SIGNATURE`, `INSUFFICIENT_*`, `TOKEN_NOT_ASSOCIATED_*`, malformed IDs, and authorization/precheck policy errors are permanent/action-required. The full SDK status is retained in internal diagnostics, while a stable `errorCode` is exposed externally.

## Signer policy

| Environment | Storage | Rule |
|---|---|---|
| Local | env for testnet account only; `.env` is not committed | minimum balance, separate account |
| CI | secret store, restricted testnet account | tests are serialized/limited |
| Demo | platform secret store | separate operator and treasury are preferred |
| Production | **OPEN QUESTION:** KMS/HSM/MPC | least privilege, rotation, audit, emergency disable |

The private key is never serialized into a job, DB, log, or response. The job contains the signer role (`TREASURY`), which the adapter resolves to key material locally. A signer account/key must never be accepted from the client.

## Mirror Node

- Mirror Node is a read model, not the authority for an immediate submission result.
- Each read returns `observedAt` and, where available, `consensusTimestamp`.
- After a receipt, a `404`/stale balance is possible until indexing completes; this is `INDEXING`, not a failure.
- Cache: immutable token metadata for 5 minutes; balances for 5–15 seconds; negative lookup for no more than 2 seconds after a write.
- Reconciliation periodically checks `SUBMITTED` operations and transitions them to `CONFIRMED/FAILED/NEEDS_REVIEW`.

## Wallet login signatures

Wallet login is an off-chain operation. The API creates a one-time UTF-8
message. A HIP-820 wallet signs the standard
`\x19Hedera Signed Message:\n<length><message>` payload and returns a signature
map. The frontend wallet adapter extracts its single raw signature, and
`packages/hedera` verifies it against the account public key returned by Mirror
Node. MetaMask uses `personal_sign`; the verifier recovers its EVM address and
requires it to match the account's Mirror Node `evm_address`. For a completed
ECDSA account, the current account key must match as well; hollow accounts
legitimately have no key until completion. Both paths store the canonical
`0.0.x` account ID. Successful first login creates `User` and `Wallet` records
and an opaque hashed session; it does not submit a Hedera transaction.

**MVP limitation:** MetaMask requires an ECDSA account present on Hedera testnet.
Native direct ED25519/ECDSA keys are supported. Threshold keys and key lists
require an explicit adapter before they can be accepted.

## Configuration

```text
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ACCOUNT_ID
HEDERA_OPERATOR_PRIVATE_KEY       # secret
HEDERA_TREASURY_ACCOUNT_ID
HEDERA_TREASURY_PRIVATE_KEY       # secret
HEDERA_SUPPLY_PRIVATE_KEY         # secret
HEDERA_HCS_ADMIN_PRIVATE_KEY      # optional secret
HEDERA_HCS_SUBMIT_PRIVATE_KEY     # secret
HEDERA_AUDIT_TOPIC_ID
HEDERA_MIRROR_NODE_URL
HEDERA_EXPLORER_BASE_URL
HEDERA_REQUEST_TIMEOUT_MS
HEDERA_RECEIPT_TIMEOUT_MS
HEDERA_MAX_ATTEMPTS
```

Startup validation rejects any network other than Testnet, invalid account
IDs/keys/URLs, missing signer roles, and invalid timeout/attempt bounds. Each
service instance owns one SDK client and exposes an explicit `close()` lifecycle
method.

## Observability and checks

- Structured logs: operation kind/ID, transaction ID, attempt, classified status, duration; no payload/keys.
- Metrics: submit/receipt latency, precheck status, retry/DLQ, Mirror lag, payer balance.
- Alerts: low payer balance, outbox oldest age, repeated `NEEDS_REVIEW`, signer/config failure.
- Contract tests run against the mock; the testnet smoke test runs separately and is not part of the mandatory unit-test suite.
- Before the demo: check account balances, the demo user's token association, topic availability, and Mirror lag.

## OPEN QUESTION

- Production custody/quorum, key rotation, and emergency procedure — owner: Hedera + Security; blocks mainnet.
- Fixed supply/custom fees — owner: Product + Hedera; blocks the final token creation DTO.
- One topic or a topic per creator — owner: Hedera; does not block the MVP.
- Mirror provider/SLA — owner: Deployment + Hedera; blocks the production SLO.
