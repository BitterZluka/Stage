# Repository Agent Guide

This file defines the shared working agreement for all coding agents in this
repository. Follow it for every task unless the user explicitly overrides it.

## Start Here

1. Read `README.md` and the relevant files under `docs/`.
2. Inspect existing code and package boundaries before editing.
3. Keep changes within the requested scope and the owning developer's area.
4. Do not commit, push, migrate a real database, or submit Hedera transactions
   unless the user explicitly requests it.

## Architecture Invariants

- PostgreSQL is the product source of truth.
- Hedera is the ownership, settlement, and public-audit layer.
- Solidity and smart contracts are prohibited.
- Browser code may connect wallets and request user-required signatures such
  as login and token/NFT association. It must not perform system blockchain
  operations.
- System HTS/HCS writes flow through `apps/api` → transactional outbox →
  `apps/worker` → `packages/hedera`.
- Database and Hedera writes are never treated as one atomic transaction.
- Every blockchain write requires a stable idempotency key and bounded retry
  policy. Ambiguous outcomes must be reconciled before resubmission.
- `packages/hedera` implements the shared `HederaProvider` contract and must
  never expose raw `@hashgraph/sdk` objects.
- HCS payloads must not contain PII, World proofs/nullifiers, shipping data,
  submission content, or private URLs.

## Package Boundaries

Allowed dependencies:

```text
apps/web    -> packages/shared, packages/ui, packages/api-client
apps/api    -> packages/shared, packages/database, packages/hedera
apps/worker -> packages/shared, packages/database, packages/hedera
packages/api-client, packages/database, packages/hedera -> packages/shared
packages/hedera -> @hashgraph/sdk
```

Never import another package through its `src/` directory. Never import from an
application into a package or from one application into another. Extract shared
code into an appropriate package instead.

## Ownership

- Frontend: `apps/web`, `packages/api-client`, `packages/ui`.
- Backend: `apps/api`, `apps/worker`, `packages/database`; primary reviewer for
  `packages/shared`.
- Hedera: `packages/hedera`, Hedera scripts, and blockchain integration docs.
- Shared contracts require review from every affected owner.

## Contract Conventions

- Cross-boundary values must be JSON-serializable TypeScript objects.
- Token amounts are non-negative base-10 strings in the token's smallest unit;
  never use JavaScript `number` for token balances.
- Timestamps are UTC ISO-8601 strings. Internal IDs are opaque branded strings.
- Public API and job payloads use shared DTOs, errors, and versioned events.
- Frontend components depend on service interfaces, not directly on HTTP or
  backend modules. Keep mock and API implementations behaviorally compatible.
- Add `TODO:` or `OPEN QUESTION:` when an MVP decision is intentionally
  temporary; do not silently settle disputed product or custody policy.

## Security

- Never commit or log private keys, session secrets, World proof material,
  nullifiers, signed storage URLs, JWTs, or personal fulfillment data.
- Never add server secrets to `NEXT_PUBLIC_*`.
- Validate World action and signal, and enforce uniqueness by action plus
  nullifier hash on the backend.
- Treat Mirror Node reads as eventually consistent after a confirmed write.

## Development Commands

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm format
pnpm db:generate
docker compose up -d postgres redis
```

Use filtered commands while iterating, then run the relevant root checks before
handoff. Do not claim Docker or testnet validation if those services were not
available.

## Change Quality

- Prefer small, reviewable changes with no unrelated cleanup.
- Preserve strict TypeScript and existing package exports.
- Add or update tests when behavior changes; contract-only changes at minimum
  require typecheck and lint.
- Update architecture/API/domain/Hedera docs when changing a boundary or public
  contract.
- Write all documentation, comments, commit messages, and PR text in English.
- Report verification performed, remaining limitations, and unresolved
  decisions in the handoff.
