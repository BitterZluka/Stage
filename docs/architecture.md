# Architecture

## Summary

The platform brings together creator communities, personal creator tokens, challenges, rewards, and perks. PostgreSQL is the product source of truth; Hedera provides verifiable tokens and auditing. Writes to the DB and Hedera are not atomic, so all system blockchain operations are created as outbox commands and executed idempotently by the worker.

**Temporary MVP solution:** a modular NestJS monolith + one BullMQ worker, one DB, and one Redis instance. Module boundaries are preserved so processes can be separated later.

```text
 Browser
   |
   v
 apps/web (Next.js) -- HTTP/SSE --> apps/api (NestJS + Fastify)
   |                                    | \
   | service interfaces                 |  +--> Redis / BullMQ --> worker
   +--> mocks                           |                         |   |
                                        v                         |   v
                                  PostgreSQL + outbox             | packages/hedera
                                                                  |   |
 World Selfie Check --------------------------------------------> API  +--> HTS / HCS
                                                                      +--> Mirror Node

Prohibited: apps/web ---------------------- system write -----------> Hedera
```

`apps/api` validates DTOs, auth/authz, and business invariants, then persists the aggregate and outbox in one DB transaction. The worker takes the command, calls `packages/hedera` through the serializable `HederaProvider`, stores the receipt/result, and publishes a domain event. Read-after-write blockchain states are confirmed through Mirror Node with indexing delay taken into account.

## Ownership

| Area | Owner | Responsibility |
|---|---|---|
| `apps/web` | Frontend | UI, routes, wallet/session UX, service interfaces, mocks; no system keys or writes |
| `apps/api` | Backend | REST/SSE, auth/authz, domain modules, Prisma transactions, outbox producer, World callback |
| `apps/worker` | Backend + Hedera | BullMQ consumers, orchestration, retry/DLQ, reconciliation |
| `packages/shared` | All three; Backend is primary | Domain types, DTOs, events, errors, and provider ports without I/O |
| `packages/api-client` | Frontend | Service interfaces, mock/API adapters, and transport boundary |
| `packages/database` | Backend | Prisma schema/client/migrations, outbox repository |
| `packages/hedera` | Hedera | SDK adapter, HTS/HCS/Mirror clients, signer policies; implements the shared port |
| `packages/ui` | Frontend | reusable UI components |

Changing a shared contract requires review by the owners on both sides. The Hedera developer does not encode product rules in the SDK adapter; the backend does not bypass the provider by using `@hashgraph/sdk` directly.

## Backend provider abstractions

Ports are defined in `packages/shared/src/providers` and implemented only at the system boundaries:

- `FileStoragePort` decouples submissions from R2/S3/MinIO and is required before the upload flow;
- `JobQueuePort` hides BullMQ and is required for outbox delivery;
- `WorldVerifierPort` isolates the provider payload and signal/nullifier checks and is required before rewards;
- `ClockPort` and `IdGeneratorPort` make idempotency/expiry testable; the mock is needed immediately,
  while production adapters can be added in the next stage;
- `ExplorerUrlBuilderPort` prevents the UI/API from constructing network-specific URLs; implementation can
  be deferred until the transaction status UI.

## Dependency directions

Allowed:

```text
apps/web    -> packages/shared, packages/ui, packages/api-client
apps/web    -> packages/world/client, packages/world/shared
apps/api    -> packages/shared, packages/database, packages/hedera, packages/world/server
apps/worker -> packages/shared, packages/database, packages/hedera
packages/api-client -> packages/shared, packages/world/shared
packages/database, packages/hedera -> packages/shared
packages/hedera -> @hashgraph/sdk
packages/world -> IDKit Core/Server and browser-safe hashing only
```

Prohibited:

- `apps/web -> @hashgraph/sdk`, `packages/hedera`, `packages/database`, or private API modules;
- system blockchain writes from the browser, a Next.js API route, or a user-supplied operator key;
- `packages/shared -> Prisma/NestJS/Fastify/Redis/Hedera/React`;
- `packages/hedera -> apps/*`, Prisma repositories, or product use cases;
- API/worker depending on each other as libraries; shared code must be extracted into a package;
- cycles between packages and passing non-serializable SDK objects through BullMQ.

## HederaProvider

Both server programs use one contract rather than a concrete SDK adapter:

`packages/shared/src/providers/hedera-provider.ts` defines separate typed methods for token
create/mint/transfer, NFT collection/mint/transfer/burn, HCS submit, and Mirror reads.
Each write input carries `operation.idempotencyKey`, a signer role, and a bounded retry policy,
and the result contains only serializable IDs/status.

The contract must contain only JSON-safe strings, numbers, booleans, and arrays/objects. `Client`, keys, `Transaction`, `Receipt`, and `BigInt` are not exposed. The API may perform safe reads, but the worker performs system writes in the normal flow.

## Consistency and write flow

1. In one Prisma transaction, the API changes the aggregate, adds a domain event, and creates `outbox(operationId, type, payload)`.
2. The relay enqueues a job with `jobId=operationId`; a unique outbox index prevents duplicates.
3. The worker claims the job, checks the local operation ledger, and calls the provider.
4. An ambiguous timeout is first checked by transaction ID/Mirror Node; resubmission is allowed only under the operation policy.
5. The result and aggregate status are recorded atomically; the HCS event does not replace the DB.
6. After the attempt limit, the command enters the DLQ and is visible to the operator/reconciliation job.

External operation statuses: `PENDING -> PROCESSING -> SUBMITTED -> CONFIRMED`, or `RETRYABLE/FAILED/NEEDS_REVIEW`. The API returns `202` and `operationId` for asynchronous write flows.

## Directories

Final Stage 0 structure:

```text
apps/
  web/                 # Frontend: Next App Router, wallet/World UI, service composition
  api/                 # Backend: Nest/Fastify HTTP boundary and use cases
  worker/              # Backend + Hedera: durable outbox/BullMQ consumers
packages/
  shared/              # All: serializable domain/DTO/event/provider contracts
  api-client/          # Frontend: service interfaces plus mock/API adapters
  database/            # Backend: Prisma schema/client/seed/migrations
  hedera/              # Hedera: SDK/Mirror/HCS adapters and deterministic mock
  ui/                  # Frontend: shared shadcn-based components
scripts/               # Hedera developer: explicit testnet setup commands
docs/                  # Shared: architecture, API, domain, Hedera, demo
```

These directories are created immediately because they are compile-time or runtime boundaries.
Files under `apps/api/src/modules/*`, `apps/worker/src/processors/*`,
`packages/database/prisma/migrations/*`, and `packages/ui/src/components/*`
are added in the next stage as implementation progresses.

Later, outside the MVP:

```text
apps/admin                 # manual retry/DLQ and moderation UI
packages/observability     # shared traces/metrics
packages/world             # isolated client/shared/server World IDKit adapter
services/indexer           # only if Mirror reads become a bottleneck
infra                      # production IaC after platform selection
```

## Security and operations

- Operator/treasury/topic keys are available only to the API/worker secret store; the web receives only public IDs.
- World proof storage is minimized; raw selfies/biometrics are not stored.
- Logs contain no JWTs, private keys, proof payloads, or PII; `requestId`, `operationId`, and `transactionId` correlate the trace.
- Rate limits: auth/World/claims are stricter than others; webhook/callback is cryptographically verified and protected against replay.
- Metrics: outbox age, queue lag, retry/DLQ, Hedera latency/status, Mirror lag, duplicate operations.

## Definition of Done

- `pnpm install`, `pnpm build`, `pnpm typecheck`, and `pnpm lint` pass;
- the Next web app and Nest/Fastify health endpoint start locally;
- shared types are available to web/api/worker, and package exports prohibit deep imports;
- `HederaProvider`, application errors, and signer/retry/idempotency policy are defined;
- frontend service interfaces and deterministic `MockHederaProvider` exist;
- the API map, domain/HCS events, open questions, and ownership are agreed upon;
- `.env.example` contains no real secrets;
- `docker compose up -d postgres redis` starts dependencies on a machine with Docker;
- each developer can start their first PR without a new blocking architecture decision.

Integration tests for the outbox, World replay, and Hedera testnet smoke belong to Stage 1:
their contracts and extension points are already defined.

## Recommended first small commits

### Frontend developer: first tasks

1. `chore(web): add TanStack Query provider and service composition`.
2. `feat(web): add wallet login message/signature flow against AuthService`.
3. `feat(web): add creator and challenge list routes using mocks`.
4. `feat(web): add World IDKit verification modal and pending state`.
5. `feat(web): add user-signed fungible/NFT association adapter`.

### Backend developer: first tasks

1. `chore(api): add auth, creators and challenges Nest modules`.
2. `feat(db): create initial migration from reviewed Prisma schema`.
3. `feat(api): persist domain mutation and outbox event atomically`.
4. `feat(worker): enqueue/claim idempotent blockchain jobs with BullMQ`.
5. `feat(world): verify action/signal and enforce nullifier uniqueness`.

### Hedera developer: first tasks

1. `feat(hedera): map SDK/Mirror failures to shared error codes`.
2. `feat(hedera): implement testnet creator-token create and reward transfer`.
3. `feat(hedera): implement claim collection/mint/transfer/burn lifecycle`.
4. `feat(hedera): add canonical HCS serializer with field allowlist`.
5. `test(hedera): add mock contract tests and opt-in testnet smoke scripts`.

Shared: `docs(contracts): freeze MVP DTOs and events`, followed by
`test(e2e): add demo happy path`.

## OPEN QUESTION

The complete decision register, including owners and temporary solutions, is in [domain-model.md](./domain-model.md#open-questions). Architecture-blocking questions are custody/signers, the supply/fees model, World verification binding, and production deployment.
