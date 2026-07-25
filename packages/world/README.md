# Stage World Selfie Check

`@stage/world` is the reusable World verification boundary for Stage. It keeps
three independent facts separate:

- authentication proves control of a Stage session;
- wallet verification proves control of a Hedera account;
- World Selfie Check provides an eligibility and abuse-resistance signal.

The package never authenticates users and never triggers Hedera transfers.

## Entry points

There is deliberately no package-root export:

```ts
import {
  createSelfieCheckRequest,
  createFakeSelfieCheckProof,
} from "@stage/world/client";
import {
  FakeWorldProvider,
  RealWorldProvider,
  createWorldProvider,
  loadWorldServerConfig,
} from "@stage/world/server";
import {
  buildStageWorldSignal,
  STAGE_SELFIE_ENROLMENT_ACTION,
} from "@stage/world/shared";
```

`@stage/world/server` throws if evaluated in a browser. Client and shared
exports contain no RP signing key, API secret, raw verifier response, or server
configuration.

## Installed protocol assumptions

This integration targets:

- `@worldcoin/idkit` 4.2.1 in `apps/web`;
- `@worldcoin/idkit-core` 4.2.2;
- `@worldcoin/idkit-server` 1.1.1;
- server verification at `POST /api/v4/verify/{rp_id}`.

Selfie Check uses `selfieCheckLegacy`, which currently produces a World ID 3.0
uniqueness proof. IDKit must therefore receive `allow_legacy_proofs: true`.
The v4 verification endpoint accepts both current v4 and legacy v3 result
shapes. If World introduces a non-legacy Selfie credential, update
`createSelfieCheckRequest()` and the normalization tests before switching.

## Signal and action

Stage allows one enrolment action:

```text
stage-selfie-enrolment-v1
```

The backend builds a canonical payload:

```json
{ "hederaAccountId": "0.0.123", "userId": "user-id" }
```

It sends only:

```text
stage:v1:<sha256(canonical-json)>
```

The browser cannot choose the expected action or signal. The server recomputes
both and checks the World response's action and IDKit signal hash.

## Providers

`RealWorldProvider` signs short-lived RP contexts with
`WORLD_RP_SIGNING_KEY`, forwards the unmodified IDKit result to World's v4
verification endpoint, and returns only normalized fields.

`FakeWorldProvider` is deterministic local/demo infrastructure. It supports:

```text
success
invalid_proof
duplicate
expired
unavailable
```

It is not cryptographically secure. Configuration rejects
`WORLD_PROVIDER=fake` when `NODE_ENV=production`; real mode never falls back to
fake mode.

## Configuration

```text
WORLD_PROVIDER=real|fake
WORLD_ENVIRONMENT=staging|sandbox|production
WORLD_APP_ID=app_...
WORLD_RP_ID=rp_...
WORLD_RP_SIGNING_KEY=<server-only 32-byte hex key; real mode only>
WORLD_VERIFY_BASE_URL=https://developer.world.org
WORLD_ACTION_SELFIE_ENROLMENT=stage-selfie-enrolment-v1
WORLD_RP_CONTEXT_TTL_SECONDS=300
WORLD_FAKE_SCENARIO=success
```

The RP signing key must never use a `NEXT_PUBLIC_` prefix.

## Verify

```bash
pnpm --filter @stage/world test
pnpm --filter @stage/world lint
pnpm --filter @stage/world typecheck
pnpm --filter @stage/world build
```

Default tests require no World credentials and make no network requests.
Real-world validation is opt-in and must use an enabled Developer Portal
application.
