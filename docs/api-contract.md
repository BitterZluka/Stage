# MVP API contract

Base URL: `/api/v1`. JSON, ISO-8601 UTC dates, string IDs, and decimal-string token amounts. The contract is published as OpenAPI; `packages/shared` contains transport types without NestJS/Prisma/SDK dependencies.

## General rules

- Auth: an opaque secure httpOnly session cookie; `401` means the session is missing/invalid, while `403` means a policy denial. The first verified wallet login creates the off-chain user automatically.
- Idempotency: mutations with an external effect require `Idempotency-Key`; a repeated request returns the same resource/operation.
- Async response: `202 { "operationId": "...", "status": "PENDING" }`.
- Pagination: `?cursor=&limit=20`, response `{ items, nextCursor }`, maximum 100.
- Correlation: request/response `X-Request-Id`; the operation ID is not the request ID.
- Error:

```json
{
  "error": {
    "code": "CHALLENGE_CLOSED",
    "message": "Challenge is closed",
    "details": {},
    "requestId": "uuid"
  }
}
```

Expected codes: `VALIDATION_FAILED(400)`, `UNAUTHENTICATED(401)`, `FORBIDDEN(403)`, `NOT_FOUND(404)`, `CONFLICT(409)`, `WORLD_VERIFICATION_REQUIRED(403)`, `RATE_LIMITED(429)`, `DEPENDENCY_UNAVAILABLE(503)`. Internal/SDK details are not returned to the client.

Auth notation: `Public`, `User`, `World` (User + verified), `Creator` (owner), `Admin`, `WorldCallback` (verified signature/proof transport).

## Endpoint map

Chain column: `—` — none; `R` — Hedera/Mirror read; `W(outbox)` — write only through outbox/worker; `HCS(outbox)` — audit projection. Sync: `sync`, `202 async`, or `eventual read`.

| Area | Method / path | Request DTO → response | Auth / authz | Errors beyond common errors | Chain | Sync |
|---|---|---|---|---|---|---|
| Auth | `POST /auth/challenge` | `{ accountId: "0.0.x" \| "0x..." }` → `{ challengeId, message, expiresAt }` | Public; rate limit | `ACCOUNT_INVALID` | Mirror key read on session creation | sync |
| Auth | `POST /auth/session` | `{ challengeId, signature }` → `SessionView` + httpOnly cookie | Public; one-time challenge | `LOGIN_CHALLENGE_INVALID`, `WALLET_ACCOUNT_NOT_FOUND`, `SIGNATURE_INVALID`, `SIGNATURE_VERIFICATION_UNAVAILABLE` | Mirror account-key/EVM address read | sync |
| Auth | `POST /auth/onboarding` | `{ intent: "fan" }` or `{ intent: "creator", handle, displayName }` → `SessionView` | User; only required for new accounts | `HANDLE_TAKEN` | — | sync |
| Auth | `GET /auth/me` | — → `UserView` | User; self | — | — | sync |
| Auth | `DELETE /auth/session` | — → `204` | User; self | — | — | sync |
| Catalog | `GET /catalog/challenges` | — → `{ items: CatalogChallenge[] }` | Public; demo fixtures merged with public DB records | — | — | sync |
| Catalog | `GET /catalog/challenges/:id` | — → `CatalogChallenge` | Public | `NOT_FOUND` | — | sync |
| Catalog | `GET /catalog/creators` | — → `{ items: CatalogCreator[] }` | Public; demo fixtures merged with active DB creators | — | — | sync |
| Catalog | `GET /catalog/creators/:handle` | — → creator with challenges and perks | Public | `NOT_FOUND` | — | sync |
| Catalog | `GET /catalog/perks` | optional `creatorId` → `{ items: CatalogPerk[] }` | Public; demo fixtures merged with public DB records | — | — | sync |
| Creators | `GET /creators` | query `cursor,limit` → page `CreatorCard` | Public | — | — | sync |
| Creators | `POST /creators` | `CreateCreatorDto` → `CreatorView` | User; one owned creator in MVP | `HANDLE_TAKEN`, `CREATOR_LIMIT` | HCS(outbox) | sync DB; audit eventual |
| Creators | `GET /creators/:creatorId` | — → `CreatorView` | Public | — | — | sync |
| Creators | `PATCH /creators/:creatorId` | `UpdateCreatorDto` → `CreatorView` | Creator | `HANDLE_TAKEN`, `VERSION_CONFLICT` | — | sync |
| Tokens | `POST /creators/:creatorId/token` | `CreateTokenDto` → `OperationAccepted` | Creator; no active token | `TOKEN_EXISTS`, `INVALID_SUPPLY` | W(outbox)+HCS | 202 async |
| Tokens | `GET /creators/:creatorId/token` | — → `CreatorTokenView` | Public | `TOKEN_NOT_CREATED` | R optional | eventual read |
| Tokens | `GET /operations/:operationId` | — → `OperationView` | User; actor/affected creator/admin | — | R during reconciliation | eventual read |
| Challenges | `GET /challenges` | filters `creatorId,status,cursor` → page | Public | `FILTER_INVALID` | — | sync |
| Challenges | `GET /challenges/mine` | filters `status,cursor,limit` → page including private states | Creator; owned profile from session | `CREATOR_INACTIVE` | — | sync |
| Challenges | `POST /challenges` | `CreateChallengeDto` → `ChallengeView` | Creator; `creatorId` must be owned | `CREATOR_INACTIVE`, `REWARD_BUDGET_EXCEEDED` | — | sync |
| Challenges | `GET /challenges/:challengeId` | — → `ChallengeView` | Public; published, judging, or completed | — | — | sync |
| Challenges | `PATCH /challenges/:challengeId` | `UpdateChallengeDto` → view | Creator; only draft | `CHALLENGE_NOT_DRAFT`, `VERSION_CONFLICT` | — | sync |
| Challenges | `DELETE /challenges/:challengeId` | `{ expectedVersion }` → `204` | Creator owner; only draft | `CHALLENGE_NOT_DRAFT`, `VERSION_CONFLICT` | — | sync |
| Challenges | `POST /challenges/:challengeId/publish` | — → view | Creator | `CHALLENGE_NOT_PUBLISHABLE`, `REWARD_BUDGET_EXCEEDED`, `CREATOR_TOKEN_NOT_ACTIVE` | HCS(outbox) | sync DB; audit eventual |
| Challenges | `POST /challenges/:challengeId/close` | — → view | Creator | `INVALID_CHALLENGE_TRANSITION` | — | sync |
| Challenges | `POST /challenges/:challengeId/complete` | — → view | Creator; all submissions decided | `SUBMISSIONS_PENDING` | — | sync |
| Challenges | `POST /challenges/:challengeId/cancel` | — → view | Creator; non-terminal challenge | `INVALID_CHALLENGE_TRANSITION` | — | sync |
| Submissions | `POST /challenges/:challengeId/submissions` | `CreateSubmissionDto` → `SubmissionView` | User; challenge open, one/user; creator-token threshold checked when non-zero | `CHALLENGE_NOT_ACCEPTING_SUBMISSIONS`, `SUBMISSION_ALREADY_EXISTS`, `TOKEN_NOT_ASSOCIATED`, `TOKEN_BALANCE_INSUFFICIENT` | Mirror token-balance read when gated | sync |
| Submissions | `GET /submissions/:submissionId` | — → view | author, challenge Creator, Admin | — | — | sync |
| Submissions | `GET /challenges/:challengeId/submissions` | query `status,cursor` → page | Creator; own challenge | — | — | sync |
| Submissions | `POST /submissions/:submissionId/decision` | `DecisionDto` → submission/payout | Creator; own challenge in judging | `SUBMISSION_ALREADY_DECIDED`, `WINNER_LIMIT_REACHED`, `WORLD_VERIFICATION_REQUIRED` | accepted: W(outbox)+HCS | sync reservation; payout eventual |
| Rewards | `GET /submissions/:submissionId/payout` | — → `RewardPayoutView` | recipient or challenge Creator | — | R optional | eventual read |
| Rewards | `GET /rewards` | query `cursor` → page `RewardView` | User; own rewards | — | R optional | eventual read |
| Rewards | `GET /rewards/:rewardId` | — → `RewardView` | recipient, Creator, Admin | — | R during reconciliation | eventual read |
| World | `POST /world/rp-context` | `{ hederaAccountId? }` → public IDKit config + RP context | User; linked wallet | `WALLET_REQUIRED`, `CONFIGURATION_ERROR` | — | sync |
| World | `POST /world/verify` | `{ proof, hederaAccountId? }` → `WorldVerificationView` | User; action/signal rebuilt by backend | `PROOF_INVALID`, `PROOF_REPLAYED`, `ACTION_MISMATCH`, `SIGNAL_MISMATCH` | — | sync/idempotent |
| World | `GET /world/status` | — → view | User; self | — | — | sync |
| Perks | `GET /creators/:creatorId/perks` | query `cursor` → page | Public | — | — | sync |
| Perks | `GET /perks/:perkId` | — → `PerkView` | Public; non-draft | — | — | sync |
| Perks | `POST /creators/:creatorId/perks` | `CreatePerkDto` → `PerkView` | Creator owner | `CREATOR_INACTIVE`, `THRESHOLD_INVALID`, `INVENTORY_INVALID` | — | sync |
| Perks | `PATCH /perks/:perkId` | `UpdatePerkDto` → view | Creator; draft only | `PERK_NOT_DRAFT`, `VERSION_CONFLICT` | — | sync |
| Perks | `POST /perks/:perkId/activate` | `{ expectedVersion }` → view | Creator | `CREATOR_TOKEN_NOT_ACTIVE`, `VERSION_CONFLICT` | HCS(outbox) | sync DB; audit eventual |
| Perks | `POST /perks/:perkId/pause` | `{ expectedVersion }` → view | Creator | `INVALID_PERK_TRANSITION` | — | sync |
| Perks | `POST /perks/:perkId/resume` | `{ expectedVersion }` → view | Creator | `CREATOR_TOKEN_NOT_ACTIVE` | — | sync |
| Claims | `POST /perks/:perkId/claims` | `{ accountId? }` → `ClaimView` | User; World when required; eligible token holder | `TOKEN_NOT_ASSOCIATED`, `TOKEN_BALANCE_INSUFFICIENT`, `PERK_OUT_OF_STOCK` | Mirror read | sync/idempotent |
| Claims | `GET /claims` | query `cursor` → own page | User; self | — | — | sync |
| Claims | `GET /perks/:perkId/claims` | query `cursor,status` → page | Creator; own perk | — | — | sync |
| Claims | `GET /claims/:claimId` | — → view | claimant, perk Creator, Admin | — | — | sync |
| Claims | `POST /claims/:claimId/fulfill` | `{ expectedVersion, note? }` → `ClaimView` | Creator; own perk | `CLAIM_ALREADY_FINAL`, `VERSION_CONFLICT` | HCS(outbox) | sync DB; audit eventual |
| Audit | `GET /audit/events` | filters `aggregateType,aggregateId,cursor` → redacted page | User; own/Creator scope, Admin all | `AUDIT_SCOPE_INVALID` | — | sync |
| Audit | `GET /audit/public/:publicRef` | — → HCS-backed proof/view | Public | `ANCHOR_NOT_FOUND` | R | eventual read |

## Key DTOs

```ts
type CreateCreatorDto = {
  handle: string;          // ^[a-z0-9-]{3,32}$
  displayName: string;     // 1..80
  bio?: string;            // <= 500
};

type CreateTokenDto = {
  name: string;            // 1..100
  symbol: string;          // 1..10, uppercase
  decimals: number;        // MVP: 0
  initialSupply: string;   // positive base units
};

type CreateChallengeDto = {
  creatorId: string;
  title: string;
  description: string;
  submissionKind: "link" | "video" | "image" | "text";
  verificationMode?: "manual";
  startsAt: string;
  submissionDeadline: string;
  rewardAmount: string;    // server binds creator token
  maxWinners: number;      // 1 means a single-winner challenge
  participationTokenAmount: string; // non-negative; 0 means open participation
};

type CreateSubmissionDto = {
  text?: string;           // required for TEXT challenges
  evidenceUrl?: string;    // public HTTPS URL for LINK/VIDEO/IMAGE
};

type DecisionDto =
  | { decision: "accept"; expectedVersion: number }
  | { decision: "reject"; reasonCode: string; note?: string; expectedVersion: number };

type WorldProofDto = {
  proof: unknown;          // forwarded unchanged to the server adapter
  hederaAccountId?: string;
};

type CreatePerkDto = {
  title: string;
  description: string;
  tokenThreshold: string;  // positive creator-token base units; not spent
  inventory: number;       // 1..10000
  requiresWorldVerification: boolean;
};

type CreateClaimDto = {
  accountId?: string;      // must be a verified wallet owned by this user
};
```

Response views do not contain another user's email, World proof/nullifier, signer/key references, treasury account internals, or raw Hedera receipts. `CreatorTokenView.chainStatus` and `RewardView.chainStatus` explicitly distinguish `PENDING`, `CONFIRMED`, and `FAILED`.

## Frontend services and mocks

`apps/web` depends on `CatalogService` for public discovery reads and on `AuthService`, `CreatorService`, `ChallengeService`, `SubmissionService`, `RewardService`, `WorldService`, `PerkService`, and `ClaimService` for domain workflows. The `Api*Service` implementation calls the API. The catalog temporarily merges backend demo fixtures with public PostgreSQL records; authenticated mutations never write to those fixtures.

**Temporary MVP solution:** poll `/operations/:id` every 2 seconds with backoff and stop after 60 seconds; after polling stops, the UI displays “processing continues,” not a transaction error.
