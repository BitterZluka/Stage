# World Selfie Check integration

## Boundary and flow

World is an eligibility provider, not Stage authentication and not wallet
ownership. The integrated post-login flow is:

```text
wallet connected and ownership signature verified
  -> authenticated Stage session created
  -> automatic post-login Selfie Check prompt
  -> verified Hedera wallet selected by backend
  -> POST /api/v1/world/rp-context
  -> IDKit Selfie Check in browser
  -> POST /api/v1/world/verify
  -> World verifier called by backend
  -> normalized World identity + replay record stored
  -> challenge eligibility checked
  -> reward claim reserved
  -> Hedera payout queued separately through the outbox
```

`packages/world` has isolated exports:

- `@stage/world/client`: public IDKit request and UI error helpers;
- `@stage/world/server`: provider configuration, RP signing, verification and
  normalized errors;
- `@stage/world/shared`: JSON-safe types, action allow-list and signal helper.

There is no root export, so browser code cannot accidentally import the server
adapter.

## Current World APIs

The web application uses `@worldcoin/idkit` 4.2.1. The reusable package uses
IDKit Core 4.2.2 and IDKit Server 1.1.1. Current v4 integration requires a
server-generated RP context with `rp_id`, nonce, timestamps and signature. The
browser forwards IDKit's result unchanged to Stage; Stage forwards it unchanged
to:

```text
POST https://developer.world.org/api/v4/verify/{rp_id}
```

See the official [IDKit integration guide](https://docs.world.org/world-id/idkit/integrate),
[React reference](https://docs.world.org/world-id/idkit/react), and
[verification API](https://docs.world.org/api-reference/developer-portal/verify).

Selfie Check is currently Beta and the installed SDK describes
`selfieCheckLegacy` as preview. It returns a v3 uniqueness response, so Stage
sets `allow_legacy_proofs: true` while using the current v4 verification
endpoint. Do not claim real availability until the configured Developer Portal
application successfully completes a staging proof.

## Developer Portal and access

For real mode:

1. Create or select an external World ID application in the Developer Portal.
2. Enable World ID 4.0/RP registration.
3. Record the `app_...` and `rp_...` identifiers.
4. Store the RP signing key immediately in a server secret store.
5. Confirm Selfie Check Beta is enabled for the application or partner account.
6. Configure a staging action named `stage-selfie-enrolment-v1`.
7. Test desktop QR and mobile deep-link flows before production.

If Selfie Check is unavailable, use explicit fake mode for local UI work or
contact World for access. Real mode never silently falls back.

## Configuration

```env
WORLD_PROVIDER=real
WORLD_ENVIRONMENT=staging
WORLD_APP_ID=app_xxx
WORLD_RP_ID=rp_xxx
WORLD_RP_SIGNING_KEY=<server-secret>
WORLD_VERIFY_BASE_URL=https://developer.world.org
WORLD_ACTION_SELFIE_ENROLMENT=stage-selfie-enrolment-v1
WORLD_RP_CONTEXT_TTL_SECONDS=300
```

Local deterministic mode:

```env
WORLD_PROVIDER=fake
WORLD_ENVIRONMENT=staging
WORLD_FAKE_SCENARIO=success
```

Valid fake scenarios are `success`, `invalid_proof`, `duplicate`, `expired`,
and `unavailable`. Fake mode is rejected when `NODE_ENV=production`.

No `NEXT_PUBLIC_WORLD_*` values are needed. Public configuration comes from the
authenticated RP-context endpoint.

## Action, signal and proof checks

The only allow-listed action is:

```text
stage-selfie-enrolment-v1
```

The API loads the authenticated user and linked, wallet-verified Hedera account,
then hashes canonical JSON containing both identifiers:

```text
stage:v1:<sha256({"hederaAccountId":"...","userId":"..."})>
```

Only the versioned hash is sent to IDKit. `/world/verify` reloads the session,
rebuilds the signal, checks the proof action, checks the IDKit signal hash, and
then calls the World verifier.

## Protocol normalization

Application code stores stable normalized concepts rather than raw protocol
objects:

- `protocolVersion`: IDKit `protocol_version`;
- `credentialType`: response identifier mapped to `selfie_check`,
  `proof_of_human`, or `unknown`;
- `replayKey`: verified RP/action-scoped `nullifier`, stored as a canonical,
  lowercase, leading-zero-free hexadecimal string (never a JavaScript number);
- `sessionId`: verifier session ID only when World returns one;
- `subjectKey`: only when a protocol explicitly supplies a stable subject.

The current legacy Selfie uniqueness flow does not fabricate a subject or
session identifier. Its verified nullifier is used only for replay protection.

## Persistence and uniqueness

The Prisma models are:

- `WorldIdentity`: one active normalized identity per Stage user;
- `WorldProofReplay`: unique `(action, replayKey)` proof acceptance;
- `WorldRewardClaim`: unique `(challengeId, worldIdentityId, rewardType)`.

The legacy `WorldVerification` placeholder is migrated into the normalized
tables by a new migration. Raw proofs, selfies, photos, biometric templates,
complete World API responses, and unhashed Stage signal inputs are not stored.

`WorldEligibilityService` checks the challenge, Stage submission and verified
identity. Reward-claim reservation is separate so the eventual reward/outbox
creation can include it in one database transaction. `packages/world` never
calls Hedera.

## API

All routes require the HTTP-only Stage session cookie:

```text
POST /api/v1/world/rp-context
POST /api/v1/world/verify
GET  /api/v1/world/status
```

`rp-context` accepts an optional linked `hederaAccountId`. When omitted, the
backend selects the first linked account deterministically. Responses contain
only public IDKit configuration and the short-lived RP context.

`verify` accepts the opaque IDKit proof plus the same optional wallet selector.
It never accepts an action or expected signal from the browser.

`status` returns only `verified`, credential type, verification time and the
real/fake provider label. It never returns replay keys or proof material.

## Frontend

After wallet login creates a Stage session, the root layout checks
`/world/status`. Unverified users receive an automatic post-login prompt before
profile onboarding. They may dismiss it and remain signed in, but protected
reward actions remain unavailable until verification succeeds. The modal
requests a context and opens
`IDKitRequestWidget` with `selfieCheckLegacy`. IDKit provides desktop QR and
mobile hand-off behavior. The widget's `handleVerify` calls Stage before
`onSuccess`; therefore the UI does not become verified merely because IDKit
returned a payload.

World remains separate from wallet authentication: the wallet signature creates
the session first. `/eligibility` is retained as a compatibility/status page
that can reopen the verification prompt.

Fake mode is visibly labelled `DEMO MODE` and bypasses IDKit with a deterministic
fake proof accepted only by `FakeWorldProvider`.

## Privacy and logging

Never log proof payloads, replay keys/nullifiers, RP signatures, signing keys,
complete verifier responses, selfies, or unhashed user/wallet signal inputs.
World errors expose only a stable code, safe message and retryability.

World identifiers must never be included in HCS audit payloads.

## Manual staging checklist

1. Run all unit, type, lint and build checks in fake mode.
2. Authenticate with a wallet-backed Stage session.
3. Confirm `/world/status` returns `verified: false`.
4. Log in with a wallet and complete the automatically presented QR flow.
5. Repeat on mobile and confirm the World deep link returns correctly.
6. Confirm `/world/verify` is the only source of `verified: true`.
7. Confirm the database stores identity metadata and replay key, not raw proof.
8. Re-submit the same proof and confirm idempotent same-user behavior or a safe
   replay response.
9. Attempt to bind it to another Stage user and confirm rejection.
10. Reserve one reward type for a challenge twice and confirm the unique
    constraint prevents the second claim.
11. Verify no World data is published to HCS and no Hedera payout occurs in the
    World endpoint.

## Known limitations

- Real Selfie Check access and partner enablement cannot be inferred from local
  placeholders; it requires an enabled Developer Portal application.
- The current flow uses legacy v3 Selfie proofs through the v4 verifier.
- The post-login modal is a frontend gate. Backend reward and challenge actions
  must continue enforcing World eligibility independently.
- Reward eligibility is exposed as a backend service seam. The challenge reward
  transaction/outbox module must call it when that Stage 1 module is built.
- Real credential tests are intentionally environment-gated and are not part of
  the default suite.
