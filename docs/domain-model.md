# Domain model

## Boundaries

| Bounded context | Aggregates / entities | Invariants |
|---|---|---|
| Identity | `User`, `Wallet`, `LoginChallenge`, `Session`, `WorldIdentity`, `WorldProofReplay` | wallet ownership is proven by a one-time signature; first login creates the user and requires fan/creator onboarding; a World proof is not authentication |
| Creators | `CreatorProfile`, `Membership` | only the owner/admin may change the profile; the handle is unique |
| Creator Economy | `CreatorToken`, `TokenOperation` | one active token per creator; amounts are decimal strings |
| Challenges | `Challenge`, `Submission`, `Review` | submission only within the window and optional creator-token threshold; reward after acceptance; one decision per version |
| Rewards | `RewardGrant` | unique by `(submissionId, recipientId, reason)` |
| Perks | `Perk`, `PerkClaim` | World and Mirror token-gate eligibility is server-checked; one claim per user; claims do not exceed inventory |
| Audit | `AuditEvent`, `OutboxMessage` | append-only; public HCS payload contains no PII |

Contexts communicate through IDs and events. Prisma relations do not give one module permission to modify another module's aggregate.

## Primary states

- `CreatorToken`: `DRAFT -> CREATING -> ACTIVE | FAILED | PAUSED`.
- `Challenge`: `DRAFT -> PUBLISHED -> JUDGING -> COMPLETED`; `DRAFT`, `PUBLISHED`, and `JUDGING` may transition to terminal `CANCELLED`.
- `Submission`: `SUBMITTED -> WINNER | REJECTED`; winner selection atomically reserves one of the challenge's bounded reward slots.
- `Perk`: `DRAFT -> ACTIVE <-> PAUSED`; the final inventory reservation moves it to terminal `EXHAUSTED`.
- `PerkClaim`: `CLAIMED -> FULFILLED`; fulfillment is manual and PostgreSQL-backed in the MVP.
- `WorldIdentity`: absent or verified; rejected/expired proof attempts are not persisted as identities.

**Temporary MVP solution:** the creator performs the review; there is no moderation/admin override. Each user may make one submission per challenge, and editing after submission is prohibited.

World Selfie Check is part of the login/onboarding flow, so creators do not
configure it per challenge. A challenge may instead define a non-negative
creator-token participation threshold. The API verifies the linked Hedera
account and current Mirror Node balance before accepting a gated submission;
tokens are held, not spent.

Draft challenges may be hard-deleted by their creator before publication.
Published and later lifecycle states remain durable for submissions and public
audit history; creators cancel those challenges instead of deleting them.

`FAN` and `CREATOR` are onboarding intents, not exclusive authorization roles.
Every user may participate as a fan. Creator capabilities are granted by an
optional one-to-one `Creator` profile, so a fan may become a creator later.

## Identifiers and money

- Internal IDs are UUIDv7 strings; Hedera IDs (`0.0.x`) and timestamps are strings.
- Token amounts and thresholds are base-unit decimal strings, never JS `number`.
- `operationId` is stable for one business intent and unique in the DB/Hedera operation ledger.
- API time uses ISO-8601 UTC; the HCS/Mirror consensus timestamp is stored as a separate string.

## Domain event envelope

```json
{
  "eventId": "uuid",
  "eventType": "submission.accepted.v1",
  "aggregateType": "Submission",
  "aggregateId": "uuid",
  "occurredAt": "2026-07-25T12:00:00.000Z",
  "actor": { "type": "USER", "publicRef": "uuid-or-null" },
  "correlationId": "uuid",
  "causationId": "uuid-or-null",
  "schemaVersion": 1,
  "data": {}
}
```

In the DB, the envelope additionally contains `actorUserId`, `requestId`, `ipHash`, internal metadata, and the full payload. HCS receives canonical JSON with an allowlist projection. The `publicRef` field is a random audit alias, not an email, wallet, or World nullifier.

## Events and visibility

`HCS-safe` means publication is permitted after a size check and canonical serialization. HCS is a public immutable log, so DB-only fields are never sent.

| Event type | Required `data` | HCS-safe projection | DB-only |
|---|---|---|---|
| `user.registered.v1` | `userId`, `authMethod` | not published in the MVP | email, account links, IP/session |
| `world.verification.requested.v1` | `verificationId`, `userId`, `action` | not published | proof, signal, nullifier, userId |
| `world.verification.completed.v1` | `verificationId`, `result`, `verifiedAt` | `verificationRef`, result, verifiedAt | proof, nullifierHash, userId, errors |
| `creator.created.v1` | `creatorId`, `ownerUserId`, `handle` | creatorId, handle, occurredAt | ownerUserId, draft/contact data |
| `creator.token.creation_requested.v1` | `creatorId`, `operationId`, `name`, `symbol`, `decimals`, `initialSupply` | operationId, creatorId, name, symbol, decimals | signer/key refs, internal policy |
| `creator.token.created.v1` | `creatorId`, `operationId`, `tokenId`, `transactionId` | all listed fields + consensusTimestamp | receipt bytes, retry/debug data |
| `creator.token.creation_failed.v1` | `creatorId`, `operationId`, `errorCode` | not published until manual classification | SDK error, stack, attempts |
| `challenge.published.v1` | `challengeId`, `creatorId`, `title`, `startsAt`, `endsAt`, `reward` | IDs, title, times, tokenId, amount | draft, reviewer notes |
| `submission.created.v1` | `submissionId`, `challengeId`, `authorUserId`, `createdAt` | not published | authorUserId, content, attachment URLs |
| `submission.submitted.v1` | `submissionId`, `challengeId`, `submittedAt`, `contentHash` | submissionId, challengeId, submittedAt, contentHash | content, authorUserId, moderation |
| `submission.accepted.v1` | `submissionId`, `challengeId`, `reviewedAt`, `rewardOperationId` | IDs, reviewedAt, operationId | reviewerUserId, notes |
| `submission.rejected.v1` | `submissionId`, `challengeId`, `reviewedAt`, `reasonCode` | not published in the MVP | author/reviewer IDs, notes, reason detail |
| `reward.requested.v1` | `rewardId`, `submissionId`, `recipientUserId`, `tokenId`, `amount`, `operationId` | rewardId, submissionId, tokenId, amount, operationId | recipientUserId/accountId, signer |
| `reward.transferred.v1` | `rewardId`, `operationId`, `tokenId`, `amount`, `transactionId` | all listed fields + consensusTimestamp | recipient identity, receipt bytes |
| `reward.failed.v1` | `rewardId`, `operationId`, `errorCode` | not published | accountId, SDK error, attempts |
| `perk.created.v1` | `perkId`, `creatorId`, `title`, `threshold`, `inventory` | perkId, creatorId, title, tokenId, threshold | fulfillment config |
| `perk.claim.requested.v1` | `claimId`, `perkId`, `claimantUserId`, `operationId` | claimId, perkId, operationId | claimantUserId, shipping/contact |
| `perk.claim.fulfilled.v1` | `claimId`, `perkId`, `fulfilledAt` | claimId, perkId, fulfilledAt | fulfillment evidence/address |
| `audit.anchor.submitted.v1` | `batchId`, `operationId`, `merkleRoot`, `fromEventId`, `toEventId` | batchId, operationId, merkleRoot, range | event payloads, internal sequence |

`contentHash` is published only after product/security review: the hash of short or predictable text can disclose its content through brute force. **Temporary MVP solution:** the hash includes a server-generated random salt, and the salt remains DB-only.

### Canonical application events

All events have an envelope containing `eventId`, `eventName`, `entityId`, `actorId | "system"`,
`version=1`, `occurredAt`, `idempotencyKey`, and `payload`. `actorId` and idempotency metadata
remain in PostgreSQL; HCS receives only the allowlist projection.

| Event | Entity | Required payload | HCS-safe | PostgreSQL only |
|---|---|---|---|---|
| `CreatorCreated` | creator | `creatorId, handle` | creatorId, handle | actorId, owner/contact |
| `CreatorTokenCreated` | creatorToken | `creatorId, creatorTokenId, hederaTokenId` | listed IDs | signer/key refs, attempts |
| `ChallengePublished` | challenge | `challengeId, creatorId, participationRewardAmount, rewardAmount` | IDs, amounts | draft/reviewer metadata |
| `SubmissionCreated` | submission | `submissionId, challengeId, authorId` | not published in the MVP | authorId, text, links, files |
| `WinnerSelected` | submission | `challengeId, submissionId, winnerId` | challengeId, submissionId | winnerId, review notes |
| `RewardPayoutRequested` | submission | `challengeId, submissionId, recipientId, rewardType, amount` | IDs, rewardType, amount | recipientId/accountId |
| `RewardPayoutConfirmed` | submission | `challengeId, submissionId, rewardType, transactionId` | IDs, rewardType, transactionId | receipt/debug data |
| `PerkCreated` | perk | `perkId, creatorId, price` | IDs, price | fulfillment config |
| `ClaimMintRequested` | claim | `claimId, perkId, claimantId` | claimId, perkId | claimantId, address/contact |
| `ClaimMinted` | claim | `claimId, nftTokenId, nftSerial, transactionId` | listed IDs | receipt/debug data |
| `ClaimRedeemRequested` | claim | `claimId, claimantId` | claimId | claimantId, fulfillment data |
| `ClaimRedeemed` | claim | `claimId, transactionId` | claimId, transactionId | evidence/address/notes |

## Policies

- Creator actions: `creator.ownerUserId == actor.id`; admin bypass is permitted only through a separate audited policy.
- Submission: authenticated, challenge is `PUBLISHED`, current time is within the window, and evidence matches the challenge kind.
- Participation reward: an API-accepted submission atomically reserves one `PARTICIPATION` payout and outbox command. The participant receives it regardless of a later winner decision.
- Winner reward: optional. When configured, only a creator decision during `JUDGING` can reserve a `WINNER` payout; World verification, amount, recipient, and remaining winner capacity are checked atomically. A challenge with `maxWinners=0` can complete without reviewing submissions.
- Perk claim: authenticated + World verified + confirmed token association/balance through Mirror; the snapshot is recorded in the DB.
- Audit reads: the public HCS projection is publicly accessible; DB audit is available to the owner/admin with redaction.

## OPEN QUESTIONS

Each item requires an ADR before production. `Blocking` indicates which stage is blocked.

| Category / question | Why | Owner | Blocking | **Temporary MVP solution** | Alternatives and trade-offs |
|---|---|---|---|---|---|
| Product: fungible token or NFT? | changes rewards/perks and supply | Product + Hedera | schema/testnet | HTS fungible token, 0 decimals | NFTs are unique, but make high-volume rewards more complex |
| Product: supply/fees/burn? | affects economics and keys | Product | launch | fixed initial supply, no custom fees/burn | finite supply is simpler; mintable is more flexible but requires a supply key |
| Product: who reviews submissions? | determines authz/disputes | Product + Backend | API | creator owner only | moderators scale better but require RBAC/UI |
| Frontend: is a wallet required? | affects onboarding | Frontend + Product | demo UX | accountId is added after auth; the custodial treasury issues the reward | wallet-first is transparent but creates more friction |
| Frontend: realtime transport? | statuses of async operations | Frontend + Backend | demo | poll `GET operation` every 2s | SSE provides better UX; WebSocket is excessive |
| Backend: event granularity/retention? | audit, storage, replay | Backend | production | events above; DB retained indefinitely for the demo | TTL is cheaper but impairs investigations |
| Backend: who publishes the HCS projection? | ordering/outbox semantics | Backend + Hedera | implementation | the same worker after a successful DB command | a separate projector scales more reliably but is more complex |
| Hedera: custody and signer quorum? | primary key risk | Hedera + Security | production | one testnet operator in the secret store | KMS/HSM + multisig is safer but more expensive/slower |
| Hedera: topic per app/creator? | filtering, cost, ACL | Hedera | topic creation | one audit topic with creatorId | per-creator isolation is better, but lifecycle/cost is higher |
| Hedera: finality through receipt or Mirror? | UX and reconciliation | Hedera + Backend | worker | receipt=confirmed, Mirror=eventual read check | Mirror-only is uniform but slower |
| Hedera: one treasury or account per creator? | custody, fees, and signer lifecycle | Product + Hedera | token adapter | one platform treasury | per-creator is more transparent but requires onboarding/custody |
| Hedera: who signs purchase/reward transfers? | determines custody and UX | Hedera + Security | transfer flow | system treasury signs payouts; users sign only association | user-signed purchases are non-custodial but require more complex orchestration |
| Hedera: burn or status-only redemption? | changes NFT lifecycle and proof of ownership | Product + Hedera | claim flow | burn after creator fulfillment confirmation | status-only preserves the NFT but may cause confusion about validity |
| Hedera: one NFT collection or per creator? | metadata, keys, cost, and discoverability | Product + Hedera | first mint | collection per creator | a global collection is simpler but weakens brand boundaries |
| Frontend: where does token/NFT association occur? | requires a user signature and affects payout failures | Frontend + Hedera | reward/claim UX | wallet flow in web before the eligibility action | auto-association depends on wallet/account limits |
| Backend: are a separate worker and Redis required? | async writes cannot be performed safely in the request | Backend | blockchain writes | separate worker + Redis/BullMQ from the first stage | an in-process queue is simpler but loses durability |
| Hedera: which events actually go to HCS? | visibility, privacy, and cost | Product + Security + Hedera | demo audit | token/challenge/winner/reward/claim lifecycle allowlist | publishing less is safer; batch anchors are cheaper |
| World: exact action/signal binding? | replay and cross-user proof | World + Security | integration | action=`stage-selfie-enrolment-v1`, signal=`stage:v1:sha256(canonical userId + Hedera accountId)` | per-challenge actions are stricter but complicate enrolment and migrations |
| World: store the nullifier? | uniqueness versus privacy | World + Security | integration | store the verifier-confirmed RP/action-scoped replay key with an action composite unique constraint | hashing it again reduces direct comparability but complicates verifier replay reconciliation |
| Security: public audit alias rotation? | activity correlation | Security | production | random alias per event | a stable alias is easier to verify but enables deanonymization |
| Deployment: hosting/regions/secrets? | latency, compliance, operations | DevOps + Security | production | one region, managed Postgres/Redis, platform secrets | multi-region is more reliable but complicates consistency |
| Deployment: recovery objectives? | backup/DLQ/runbook | Backend + DevOps | production | daily backup; manual DLQ replay | tighter RPO/RTO requires PITR, alerting, and rehearsal |
