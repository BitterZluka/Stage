# Demo flow

Goal: demonstrate the complete “human → creator community → challenge → verifiable HTS reward → perk → HCS audit” cycle in 6–8 minutes without presenting blockchain latency as a synchronous operation.

## Personas and preparation

- Alina — creator owner.
- Boris — a participant with a Hedera testnet account and World Selfie Check.
- System — API + worker with operator/treasury/topic keys.

Before the demo:

1. API, worker, PostgreSQL, and Redis are healthy; migrations have been applied.
2. Testnet operator/treasury accounts are funded, and the audit topic exists.
3. Boris's account is associated with the creator token, or the association screen is ready.
4. Mirror Node is responding; explorer URLs are known.
5. The seed contains a creator draft, challenge draft, and perk; it contains no pre-created “successful” operations.
6. Creator and participant browser sessions are open; secrets and the World proof are hidden.

**Temporary MVP solution:** if World staging is unavailable, explicitly labeled `DEMO_WORLD_MOCK=true` is enabled; Hedera remains on testnet. If Hedera is unavailable, `MockHederaProvider` is used, and both the UI and presenter clearly identify mock mode—a mock transaction must not be presented as on-chain.

## Scenario

### 1. Sign-in and human verification — Boris

1. Boris connects his wallet and signs the one-time login message.
2. STAGE immediately presents the post-login World Selfie Check; the request is
   bound to the user's action and verified wallet.
3. After a successful proof, profile onboarding continues and the UI displays
   `Verified human`; the raw selfie/proof is neither displayed nor stored.

Briefly demonstrate the failure branch: replaying the proof returns `PROOF_REPLAYED`, and the user remains in a safe state.

### 2. Creator token — Alina

1. Alina opens the creator dashboard and requests the fixed-supply `ALINA` token.
2. The API returns `202 + operationId`; the UI displays `Pending`, not a fabricated token ID.
3. The worker executes the outbox command through `HederaProvider`.
4. Operation polling changes the status to `Confirmed`; the UI displays the HTS token ID and explorer link.

Presenter's key point: the browser does not sign the system transaction; the DB and Hedera are linked by the operation ID and an idempotent outbox.

### 3. Challenge and submission

1. Alina publishes a challenge with a reward amount denominated in the creator token.
2. Boris opens the challenge and sends a submission.
3. The UI records the submitted state; the public HCS audit contains IDs/hash, but not the text or the author's identity.
4. Alina sees the submission within the owner scope and accepts it.

### 4. Reward

1. The decision response is `202`; the submission displays `Reward pending`.
2. The worker transfers the HTS token from the treasury to Boris's account.
3. After the receipt, the status becomes `Rewarded`; the transaction ID/explorer and updated Mirror balance are displayed.
4. The HCS audit proof `reward.transferred.v1` opens without the account ID or PII.

During Mirror lag, the UI displays “transaction confirmed, balance is being indexed” and retries the read. This is not treated as a transfer failure.

### 5. Perk claim

1. Boris opens a perk with a token threshold.
2. The API checks World verification, the confirmed token balance, and inventory.
3. The claim is created once; repeating the same intent returns the existing claim.
4. Alina marks fulfillment; the public audit shows the claim ID/status, but not the address or contact details.

### 6. Verifiable conclusion

Show three linked records:

- the product object in the UI/DB;
- the HTS transaction/token in the explorer or Mirror Node;
- the HCS event with the same `operationId/eventId` and a redacted payload.

Conclude with the audit timeline screen: creator token created → challenge published → submission submitted → reward transferred → perk fulfilled.

## Failure path for judges

Choose only one to keep the demo concise:

- repeating the acceptance/idempotency key does not create a second transfer;
- an unassociated token produces an action-required state, not an endless retry;
- a temporary Hedera timeout leaves the operation `Processing`, and reconciliation finds the transaction;
- replaying the World proof is rejected.

Do not edit the DB manually during the demo. Use the seed/reset script for recovery only between runs.

## Demo DoD

- The happy path succeeds twice in succession after a clean seed.
- A second request with the same idempotency key does not change supply/balance again.
- All pending states have timeout UX and clear retry/recovery text.
- Explorer/Mirror/HCS links correspond to the IDs actually shown.
- Neither the browser network panel nor logs contain private keys, JWTs, proofs, nullifiers, or PII.
- Mock/real mode is visible in the UI; a real testnet run is recorded as a backup video.
- A backup account is available, balances/rate limits have been checked, and rollback to the seed is ready.

## Roles during the demo

- The frontend developer presents the user-facing screens and explains service mocks/pending UX.
- The backend developer demonstrates DB/outbox correlation and authz/idempotency.
- The Hedera developer demonstrates HTS/HCS/Mirror evidence, the signer boundary, and reconciliation.

## OPEN QUESTION before recording

- Product: which perk and challenge content will be clearest to the audience? Owner: Product; blocks the narrative; temporary solution: a digital perk.
- Frontend: show a polling badge or SSE? Owner: Frontend; non-blocking; temporary solution: polling.
- Backend: is an admin recovery screen required? Owner: Backend; does not block the live demo; temporary solution: CLI/runbook.
- Hedera: perform association beforehand or on camera? Owner: Hedera + Product; blocks timing; temporary solution: beforehand.
- World: is public use of staging/mock permitted at the event? Owner: World + Product; blocks messaging; temporary solution: an explicit mode badge.
- Security: may public account IDs be shown? Owner: Security; blocks screen recording; temporary solution: mask them and open the explorer on a separate demo account.
- Deployment: are testnet/Mirror endpoints stable on the venue network? Owner: Deployment; blocks live mode; temporary solution: a backup hotspot and recording.
