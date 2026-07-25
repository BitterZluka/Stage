import type {
  AuditEventId,
  CreatorId,
  IsoTimestamp,
  JsonObject,
  TransactionId,
} from "../domain/primitives.js";

/**
 * Payload permitted on HCS. It must contain only public identifiers and facts.
 * Never include PII, World ID nullifiers/proofs, submission contents, or private/signed URLs.
 */
export type AuditEventType =
  | "creator_token_created"
  | "challenge_published"
  | "winner_selected"
  | "reward_paid"
  | "perk_activated"
  | "perk_fulfilled"
  | "claim_minted"
  | "claim_redeemed";

export interface HcsSafeAuditPayload {
  schema: "ethglobal.audit";
  version: 1;
  eventId: AuditEventId;
  eventType: AuditEventType;
  occurredAt: IsoTimestamp;
  creatorId?: CreatorId;
  transactionId?: TransactionId;
  publicData: JsonObject;
}

export interface AuditRecord {
  payload: HcsSafeAuditPayload;
  hcsSequenceNumber?: string;
  hcsConsensusTimestamp?: IsoTimestamp;
}

// TODO: Add a runtime allow-list/redaction guard at the HCS adapter boundary.
// OPEN QUESTION: Choose one HCS topic globally or isolate topics per creator.
