# STAGE

STAGE is a creator-community platform where creators launch challenges, reward
participation with their own Hedera tokens, and offer token-gated perks. Fans
prove wallet ownership, complete a privacy-preserving World Selfie Check, join
challenges, receive real Hedera testnet rewards, and spend those rewards on
creator experiences.

This repository contains a working testnet MVP built with Next.js, NestJS,
PostgreSQL, World IDKit, the Hedera JavaScript SDK, Hedera Token Service (HTS),
Hedera Consensus Service (HCS), and Hedera Mirror Node. It uses no Solidity and
no application smart contracts.

## Why STAGE

Creator campaigns have two recurring problems:

- bots and duplicate accounts can drain limited community rewards;
- platform points are usually opaque, locked to one database, and difficult to
  audit.

STAGE combines a human-eligibility signal from World with native Hedera tokens
and public audit events. PostgreSQL remains the product source of truth, while
Hedera provides ownership, settlement, and independently verifiable lifecycle
evidence.

## What works

### Fans

- Connect a Hedera WalletConnect wallet or a MetaMask ECDSA account.
- Sign a one-time wallet login message.
- Complete World Selfie Check after wallet authentication.
- Browse creators, public challenges, and creator perks.
- Associate creator tokens with a Hedera account.
- Submit one entry per challenge.
- Receive participation rewards whether or not a winner is selected.
- Receive an additional winner reward when a challenge uses winners.
- Purchase perks with creator tokens through a user-approved Hedera transfer.
- View purchased perks, Hedera payment references, creator fulfillment notes,
  and `awaiting fulfillment`, `fulfilled`, or `cancelled` status.

### Creators

- Onboard a creator profile.
- Automatically queue creation of a fixed-supply creator token on Hedera
  Testnet.
- Create, update, delete, publish, close, complete, or cancel challenges.
- Configure token-gated entry, participation rewards, and optional winner
  rewards.
- Review challenge submissions and select winners only when the challenge uses
  winner rewards.
- Create, update, delete, activate, pause, and resume token-priced perks.
- Review purchased perk claims and add a private fulfillment note.

### Verifiable infrastructure

- Create and transfer fungible tokens through HTS.
- Publish redacted lifecycle events through HCS.
- Read token metadata, associations, balances, transactions, and consensus
  results through Mirror Node.
- Link user-visible transactions to HashScan.
- Process system blockchain writes through an idempotent transactional outbox
  and worker.
- Keep World proofs, selfies, nullifiers, private fulfillment data, and
  submission content out of HCS.

## End-to-end flow

```text
wallet signature
  -> Stage session
  -> World Selfie Check
  -> verified reward eligibility
  -> creator challenge submission
  -> participation/winner payout queued in PostgreSQL
  -> worker transfers creator HTS token
  -> redacted HCS audit event
  -> fan spends tokens on a perk
  -> Mirror Node verifies the exact payment
  -> creator fulfills the perk
```

The browser signs only user-required actions such as login, token association,
and perk payment. System operations such as token creation, reward transfer,
and HCS publication follow:

```text
apps/api -> PostgreSQL transaction + outbox -> apps/worker
         -> packages/hedera -> HTS/HCS
```

## Sponsor integrations

STAGE targets the **World** Selfie Check Beta sponsor track and the **Hedera**
Tokenization and “No Solidity Allowed” sponsor tracks.

### World — Selfie Check

World Selfie Check is used as an abuse-prevention and reward-eligibility signal,
not as generic authentication. Wallet ownership is verified first. Stage then
requests a server-signed RP context and binds the Selfie Check signal to the
authenticated Stage user and verified Hedera account.

The backend:

- validates the configured World action and server-derived signal;
- verifies the proof through the World verification API;
- prevents replay across users and reward claims;
- stores normalized verification metadata, not the raw selfie or proof;
- requires verification for protected challenge rewards and perks.

Implementation details are in
[`docs/world-integration.md`](docs/world-integration.md). Developer and user
feedback from beta testing is recorded in
[`docs/selfie-check-beta-testing.md`](docs/selfie-check-beta-testing.md).

### Hedera — HTS, HCS, and Mirror Node

Each creator receives a native fungible community token through HTS. Challenge
participation and winner payouts transfer that token from the treasury to the
fan. A perk purchase transfers the creator token back to the treasury through a
user-approved wallet transaction.

HCS records privacy-filtered public events for challenge publication, reward
confirmation, perk activation, perk purchase, and perk fulfillment. Mirror Node
is used for wallet resolution, association and balance checks, transaction
verification, eventual consistency, and reconciliation.

All system writes use `@hashgraph/sdk` through `packages/hedera`. There are no
Solidity contracts. See
[`docs/hedera-integration.md`](docs/hedera-integration.md).

## Hackathon track qualification

Status legend:

- ✅ implemented and demonstrable in the repository;
- 🧪 implemented, with final testnet/demo evidence to capture for submission;
- 🟡 submission action still required outside the codebase;
- ⚠️ honest track-fit limitation.

### 1. 🤳 Selfie Check Beta — World — $1,750

Awards: first place $1,000; second place $750.

| Qualification requirement           | How STAGE satisfies it                                                                                                                                                      | Status |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Meaningful Selfie Check use         | Selfie Check protects challenge rewards and token-priced perks from bots and duplicate identities. It happens after wallet login and is not used as generic authentication. | ✅     |
| Developer testing feedback          | The beta report documents access friction, RP/action setup, legacy-proof/v4-verifier compatibility, error diagnosis, and modal integration issues.                          | ✅     |
| User testing feedback               | The beta report documents comprehension, QR/deep-link, layering, success/failure mismatch, and recovery feedback observed during exploratory use.                           | ✅     |
| Working app or end-to-end prototype | Wallet login → Selfie Check → challenge eligibility → HTS payout → perk purchase is implemented across web, API, database, worker, and provider packages.                   | ✅     |
| Final external-device evidence      | Repeat the documented matrix on the final staging application and include the results in the submission.                                                                    | 🧪     |

The full testing artifact is
[`docs/selfie-check-beta-testing.md`](docs/selfie-check-beta-testing.md).

### 2. 🪙 Tokenization on Hedera — Hedera — $3,000

Up to two teams may receive $1,500.

| Qualification requirement                                | How STAGE satisfies it                                                                                                                                                              | Status |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Create, manage, or interact with HTS tokens              | Creator onboarding queues token creation; challenge rewards transfer tokens; wallet flows associate tokens; perks spend tokens back to the treasury.                                | ✅     |
| Deploy and demonstrate on Hedera Testnet                 | Real provider mode, testnet-only configuration validation, HashScan links, Mirror reads, and sequential smoke scripts are included. Capture the final clean run for the submission. | 🧪     |
| Public GitHub source                                     | The repository remote is [`BitterZluka/Stage`](https://github.com/BitterZluka/Stage). Confirm repository visibility is public before submitting.                                    | 🟡     |
| Demo video of creation/configuration/lifecycle operation | The recommended five-minute flow below covers creator token creation, reward transfer, and perk payment. Add the final video URL before submitting.                                 | 🟡     |

STAGE tokenizes creator-community participation and loyalty value. It
demonstrates a complete native-token lifecycle, but it is not a traditional
security, real-estate fraction, invoice, commodity, or other regulated
real-world asset. This is a transparent track-fit limitation because the bounty
brief says traditional RWA applications may be favoured.

Application-layer controls currently include creator ownership, fixed supply,
token association, balance checks, token-gated entry, bounded reward budgets,
inventory reservation, exact-payment verification, idempotency, and lifecycle
status. HTS KYC/freeze keys and custom fee schedules are not implemented and
must not be claimed in the submission.

### 3. 🛠️ “No Solidity Allowed” — Hedera SDKs — $3,000

Up to three teams may receive $1,000.

| Qualification requirement                 | How STAGE satisfies it                                                                                                                                                                              | Status |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Hedera SDK only; no Solidity              | `packages/hedera` uses `@hashgraph/sdk`. The repository contains no application Solidity contracts.                                                                                                 | ✅     |
| At least two native Hedera services       | HTS handles creator tokens and payouts; HCS handles audit events. Mirror Node adds network reads and reconciliation.                                                                                | ✅     |
| Public source with setup and usage README | This README covers architecture, setup, configuration, testing, and the demo workflow. Confirm GitHub visibility before submitting.                                                                 | 🟡     |
| Demo video no longer than five minutes    | The flow below demonstrates token creation, transfer, Mirror verification, perk payment, and HCS audit publication. Add the final URL before submission.                                            | 🟡     |
| Coherent end-to-end UX                    | The web application connects fan and creator workflows rather than exposing isolated SDK scripts.                                                                                                   | ✅     |
| Mirror Node integration                   | Used for account resolution, token association, balances, metadata, payment verification, and eventual reads.                                                                                       | ✅     |
| Creative HCS use                          | Public lifecycle evidence is canonicalized, size-bounded, and filtered to prevent private data from entering the immutable log.                                                                     | ✅     |
| Thoughtful security                       | Server-only keys, strict package boundaries, user/system signer separation, idempotent outbox processing, bounded retries, replay prevention, and HCS PII filtering are documented and implemented. | ✅     |

This is the project’s strongest Hedera track fit.

## Architecture

```text
apps/web
  ├─ wallet login and user-required signatures
  ├─ World IDKit Selfie Check
  └─ typed services from packages/api-client
         |
         v
apps/api
  ├─ session authentication and authorization
  ├─ challenge/perk/claim business rules
  ├─ World proof verification
  ├─ Mirror Node eligibility reads
  └─ PostgreSQL aggregate + outbox transaction
         |
         v
PostgreSQL + Redis/BullMQ -> apps/worker
                               |
                               v
                         packages/hedera
                          ├─ HTS
                          ├─ HCS
                          └─ Mirror Node
```

PostgreSQL is the product source of truth. A successful database write and a
successful Hedera write are never treated as one atomic transaction. Every
system blockchain operation has a stable idempotency key, bounded retry policy,
and reconciliation path for ambiguous outcomes.

## Repository layout

```text
apps/
  web/          Next.js frontend
  api/          NestJS REST API and transactional outbox producer
  worker/       Hedera operation and HCS audit worker
packages/
  api-client/   Frontend service contracts and HTTP implementations
  database/     Prisma schema, migrations, and database package
  hedera/       HTS/HCS/Mirror adapter and testnet scripts
  shared/       JSON-safe domain contracts, events, and validation
  ui/           Shared UI package
  world/        Isolated World client/shared/server adapters
docs/           Architecture, API, domain, integration, testing, and demo docs
```

## Local setup

### Prerequisites

- Node.js 20 or newer
- pnpm 10.13.1
- Docker with Docker Compose
- A modern browser with MetaMask or a supported Hedera WalletConnect wallet

### Install and run in deterministic local mode

```bash
git clone git@github.com:BitterZluka/Stage.git
cd Stage
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Local endpoints:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/api/v1/health`

The default `.env.example` uses `WORLD_PROVIDER=fake` and
`HEDERA_PROVIDER=mock`. Fake modes are explicit and must never be presented as
real sponsor-network evidence.

If starting everything through Turbo exceeds the operating system file-watcher
limit, run the application processes in separate terminals:

```bash
pnpm --filter @creator-platform/api dev
pnpm --filter @creator-platform/worker dev
pnpm --filter @creator-platform/web dev
```

## Real World Selfie Check

Configure a World staging application, relying party, action, and signing key:

```env
WORLD_PROVIDER=real
WORLD_ENVIRONMENT=staging
WORLD_APP_ID=app_xxx
WORLD_RP_ID=rp_xxx
WORLD_RP_SIGNING_KEY=<server-only-signing-key>
WORLD_ACTION_SELFIE_ENROLMENT=stage-selfie-enrolment-v1
WORLD_VERIFY_BASE_URL=https://developer.world.org
```

Never expose the RP signing key through a `NEXT_PUBLIC_*` variable. Real mode
does not silently fall back to the fake provider. Follow
[`docs/world-integration.md`](docs/world-integration.md) for Developer Portal
setup, signal binding, persistence, and the manual staging checklist.

## Real Hedera Testnet

Use funded testnet operator and treasury accounts. Keep every private key on the
server:

```env
HEDERA_PROVIDER=real
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ACCOUNT_ID=0.0.x
HEDERA_OPERATOR_PRIVATE_KEY=<server-only-key>
HEDERA_TREASURY_ACCOUNT_ID=0.0.y
HEDERA_TREASURY_PRIVATE_KEY=<server-only-key>
HEDERA_HCS_SUBMIT_PRIVATE_KEY=<server-only-key>
HEDERA_AUDIT_TOPIC_ID=0.0.z
HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
HEDERA_EXPLORER_BASE_URL=https://hashscan.io/testnet
```

Do not commit `.env`, private keys, session secrets, World proofs, or signed
storage URLs.

Run the worker alongside the API and web app:

```bash
pnpm --filter @creator-platform/api dev
pnpm --filter @creator-platform/worker dev
pnpm --filter @creator-platform/web dev
```

The dedicated Hedera package also contains sequential testnet smoke scripts:

```bash
pnpm --filter @creator-platform/hedera testnet:balance
pnpm --filter @creator-platform/hedera testnet:create-ft
pnpm --filter @creator-platform/hedera testnet:prepare-association
pnpm --filter @creator-platform/hedera testnet:transfer-ft
pnpm --filter @creator-platform/hedera testnet:verify-ft
pnpm --filter @creator-platform/hedera testnet:create-topic
pnpm --filter @creator-platform/hedera testnet:publish-audit
pnpm --filter @creator-platform/hedera testnet:read-audit
```

Script-specific environment variables and ordering are documented in
[`packages/hedera/README.md`](packages/hedera/README.md).

## Recommended five-minute demo

1. Log in as a creator and show automatic HTS creator-token provisioning.
2. Create and publish a participation-reward challenge.
3. Log in as a fan, complete Selfie Check, and associate the creator token.
4. Submit the challenge and show the participation payout move from pending to
   confirmed.
5. Open HashScan or Mirror Node to show the creator token and transfer.
6. Purchase a perk with a user-approved creator-token transfer.
7. Switch to Creator Studio, fulfill the perk, and show the updated status in
   the fan’s **My perks** page.
8. Show the corresponding privacy-filtered HCS audit event.

Keep the final recording at or below five minutes for the Hedera tracks. Use
real testnet and World staging modes, show actual explorer evidence, and do not
present mock IDs as blockchain transactions.

The expanded presenter runbook is
[`docs/demo-flow.md`](docs/demo-flow.md).

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Database-backed integration suites are intentionally opt-in:

```bash
RUN_DATABASE_INTEGRATION_TESTS=1 pnpm --filter @creator-platform/api test
```

Hedera testnet and real World proof tests require configured external accounts
and are separate from the deterministic default suite.

## Security and privacy

- Selfies, raw World proofs, replay keys, and RP signing keys are never logged.
- World identifiers are never published to HCS.
- Hedera operator, treasury, supply, and HCS submit keys are server-only.
- The browser cannot request arbitrary system blockchain operations.
- Public HCS events use an allowlist, canonical JSON, size limits, and recursive
  sensitive-field rejection.
- Token amounts cross service boundaries as base-10 strings, never JavaScript
  floating-point numbers.
- API authorization restricts Creator Studio resources to their owner and
  purchased perks to the purchasing user.
- Mirror Node indexing delay is represented as pending/indexing state, not as a
  fabricated failure or success.

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Domain model and HCS privacy](docs/domain-model.md)
- [Hedera integration](docs/hedera-integration.md)
- [Hedera package and smoke scripts](packages/hedera/README.md)
- [World Selfie Check integration](docs/world-integration.md)
- [Selfie Check Beta testing and feedback](docs/selfie-check-beta-testing.md)
- [Demo flow](docs/demo-flow.md)

## Submission checklist

- [ ] Confirm [`BitterZluka/Stage`](https://github.com/BitterZluka/Stage) is
      public.
- [ ] Remove all local secrets and rotate any credential exposed during
      development.
- [ ] Run the complete validation suite.
- [ ] Complete and record the final external-device Selfie Check test matrix.
- [ ] Record a clean real Hedera Testnet run.
- [ ] Add representative HashScan token, transfer, and HCS topic/message links.
- [ ] Add the final demo video URL and keep it at or below five minutes.
- [ ] Verify the video shows token creation/configuration and at least one
      lifecycle operation.
- [ ] Keep the Tokenization track description honest about the
      creator-community asset model.
