# Creator Platform

Stage 0 foundation for a creator-community platform using Next.js, NestJS,
PostgreSQL, World Selfie Check, and Hedera HTS/HCS without Solidity.

## Local setup

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:generate
pnpm dev
```

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/v1/health`
- Architecture and ownership: [`docs/architecture.md`](docs/architecture.md)
- API map: [`docs/api-contract.md`](docs/api-contract.md)
- Hedera boundary: [`docs/hedera-integration.md`](docs/hedera-integration.md)
- World Selfie Check: [`docs/world-integration.md`](docs/world-integration.md)

Copy `.env.example` to `.env` and replace placeholders locally. Never expose
operator, treasury, World, or session secrets through `NEXT_PUBLIC_*`.

## Stage 0 scope

The repository contains contracts, provider ports, mocks, outbox-oriented data
models, and safe testnet script stubs. Business logic and real blockchain
transactions intentionally start in Stage 1.
