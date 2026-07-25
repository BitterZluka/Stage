export enum CreatorStatus {
  Active = "active",
  Suspended = "suspended",
}

export enum ChallengeStatus {
  Draft = "draft",
  Published = "published",
  Judging = "judging",
  Completed = "completed",
  Cancelled = "cancelled",
}

export enum SubmissionStatus {
  Submitted = "submitted",
  Winner = "winner",
  Rejected = "rejected",
}

export enum SubmissionKind {
  Link = "link",
  Video = "video",
  Image = "image",
  Text = "text",
}

export enum VerificationMode {
  Manual = "manual",
  Automatic = "automatic",
  Hybrid = "hybrid",
}

export enum PayoutStatus {
  Pending = "pending",
  Requested = "requested",
  Confirmed = "confirmed",
  Failed = "failed",
}

export enum PerkStatus {
  Draft = "draft",
  Active = "active",
  Paused = "paused",
  Exhausted = "exhausted",
}

export enum ClaimStatus {
  Claimed = "claimed",
  Fulfilled = "fulfilled",
  Cancelled = "cancelled",
}

export enum TransactionStatus {
  Pending = "pending",
  Success = "success",
  Failed = "failed",
  Unknown = "unknown",
}
