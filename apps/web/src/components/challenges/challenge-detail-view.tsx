"use client";

import {
  ApiChallengeService,
  ApiClientError,
  ApiSubmissionService,
  type CatalogChallenge,
  type ChallengeId,
  type Submission,
  type SubmissionId,
} from "@creator-platform/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../auth/auth-provider";
import {
  type HederaAccountId,
  type HederaTokenId,
} from "@creator-platform/shared";
import { associateHederaToken } from "../../lib/hedera-wallet";
import {
  catalogService,
  mapCatalogChallenge,
} from "../../lib/catalog";
import { CheckIcon, ClockIcon, UsersIcon, ZapIcon } from "../icons";
import { Badge, type BadgeColor } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

type ViewMode = "fan" | "creator";

interface ChallengeDetail {
  id: string;
  creatorId?: string;
  creatorTokenId?: string;
  creatorName: string;
  creatorInitials: string;
  title: string;
  description: string;
  status: string;
  submissionKind: string;
  verificationMode: string;
  requiresWorldVerification: boolean;
  participationRewardAmount: string;
  rewardAmount: string;
  maxWinners: number;
  winnerCount: number;
  startsAt: string;
  submissionDeadline: string;
  accent: string;
  source: "demo" | "database";
}

const STATUS_COLOR: Record<string, BadgeColor> = {
  draft: "white",
  published: "mint",
  judging: "yellow",
  completed: "black",
  cancelled: "pink",
};

function catalogDetail(challenge: CatalogChallenge): ChallengeDetail {
  return {
    id: challenge.id,
    creatorId: challenge.creatorId,
    ...(challenge.creatorTokenId
      ? { creatorTokenId: challenge.creatorTokenId }
      : {}),
    creatorName: "Creator community",
    creatorInitials: "SC",
    title: challenge.title,
    description: challenge.description,
    status: String(challenge.status),
    submissionKind: String(challenge.submissionKind),
    verificationMode: String(challenge.verificationMode),
    requiresWorldVerification: challenge.requiresWorldVerification,
    participationRewardAmount: challenge.participationRewardAmount,
    rewardAmount: challenge.rewardAmount,
    maxWinners: challenge.maxWinners,
    winnerCount: challenge.winnerCount,
    startsAt: challenge.startsAt,
    submissionDeadline: challenge.submissionDeadline,
    accent: mapCatalogChallenge(challenge).accent,
    source: challenge.source,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function timeRemaining(value: string): string {
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return "Submissions closed";
  const days = Math.ceil(milliseconds / 86_400_000);
  return days === 1 ? "1 day remaining" : `${days} days remaining`;
}

export function ChallengeDetailView({ challengeId }: { challengeId: string }) {
  const {
    session,
    loading: authLoading,
    worldVerified,
    beginWorldVerification,
  } = useAuth();
  const challengeService = useMemo(
    () =>
      new ApiChallengeService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const submissionService = useMemo(
    () =>
      new ApiSubmissionService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("fan");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [associationRequired, setAssociationRequired] = useState(false);

  const isOwner =
    challenge?.source === "database" &&
    Boolean(challenge?.creatorId) &&
    session?.user.creatorId === challenge?.creatorId;
  const effectiveMode: ViewMode = isOwner ? mode : "fan";

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await catalogService.getChallenge(challengeId);
      if (result) {
        setChallenge(catalogDetail(result));
        return;
      }
      setError("This challenge could not be found.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the challenge.",
      );
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  const loadSubmissions = useCallback(async () => {
    if (!challenge || !isOwner || challenge.source !== "database") return;
    try {
      const page = await submissionService.listChallengeSubmissions(
        challenge.id as ChallengeId,
        { limit: 100 },
      );
      setSubmissions(page.items);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load submissions.",
      );
    }
  }, [challenge, isOwner, submissionService]);

  useEffect(() => {
    void loadChallenge();
  }, [loadChallenge]);

  useEffect(() => {
    if (isOwner) {
      setMode("creator");
      void loadSubmissions();
    }
  }, [isOwner, loadSubmissions]);

  async function submitEvidence() {
    if (!challenge || challenge.source !== "database") {
      setNotice(
        "Demo challenges are read-only. Use a published API challenge.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    setAssociationRequired(false);
    try {
      await submissionService.createSubmission({
        challengeId: challenge.id as ChallengeId,
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(evidenceUrl.trim() ? { evidenceUrl: evidenceUrl.trim() } : {}),
      });
      setText("");
      setEvidenceUrl("");
      setNotice(
        challenge.participationRewardAmount === "0"
          ? "Submission received. The creator will review it after closing."
          : `Submission received. Your ${challenge.participationRewardAmount}-token participation payout is now queued for Hedera.`,
      );
    } catch (cause) {
      if (
        cause instanceof ApiClientError &&
        cause.code === "TOKEN_NOT_ASSOCIATED"
      ) {
        setAssociationRequired(true);
      }
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Could not submit evidence.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function associateRewardToken() {
    if (!challenge?.creatorTokenId || !session) return;
    const accountId = session.user.accountIds.find((candidate) =>
      /^0\.0\.\d+$/.test(candidate),
    );
    if (!accountId) {
      setError("A canonical Hedera account is required for token association.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const transactionId = await associateHederaToken(
        accountId as HederaAccountId,
        challenge.creatorTokenId as HederaTokenId,
      );
      setAssociationRequired(false);
      setNotice(
        `Token association submitted (${transactionId}). Wait a few seconds for Mirror Node, then submit again.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Token association failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function transition(action: "close" | "complete" | "cancel") {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      const id = challenge.id as ChallengeId;
      if (action === "close") await challengeService.closeChallenge(id);
      if (action === "complete") await challengeService.completeChallenge(id);
      if (action === "cancel") await challengeService.cancelChallenge(id);
      await loadChallenge();
      await loadSubmissions();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(submission: Submission, decision: "accept" | "reject") {
    setBusy(true);
    setError(null);
    try {
      await submissionService.decideSubmission(
        submission.id as SubmissionId,
        decision === "accept"
          ? { decision, expectedVersion: submission.version }
          : {
            decision,
            expectedVersion: submission.version,
            reasonCode: "NOT_SELECTED",
          },
      );
      await loadChallenge();
      await loadSubmissions();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Decision failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-96 animate-pulse rounded-3xl border-2 border-black bg-white/60" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold">
          Challenge unavailable
        </h1>
        <p className="mt-3 text-gray-600">{error}</p>
        <Button href="/challenges" variant="ghost" className="mt-7">
          Back to challenges
        </Button>
      </div>
    );
  }

  const remainingSlots = Math.max(
    challenge.maxWinners - challenge.winnerCount,
    0,
  );
  const acceptsUrl = challenge.submissionKind !== "text";
  const canSubmit =
    challenge.source === "database" &&
    challenge.status === "published" &&
    (!challenge.requiresWorldVerification || worldVerified);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button href="/challenges" variant="ghost" size="sm">
          ← All challenges
        </Button>
        {isOwner && (
          <div className="flex rounded-xl border-2 border-black bg-white p-1">
            {(["creator", "fan"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === item ? "bg-black text-white" : "hover:bg-black/5"
                  }`}
              >
                {item === "creator" ? "Creator view" : "Fan preview"}
              </button>
            ))}
          </div>
        )}
      </div>

      <section
        className="relative overflow-hidden rounded-3xl border-2 border-black p-6 shadow-offset sm:p-10"
        style={{
          background: `linear-gradient(135deg, ${challenge.accent}, #ffffff 72%)`,
        }}
      >
        <div
          className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge color={STATUS_COLOR[challenge.status] ?? "white"}>
              {challenge.status}
            </Badge>
            <Badge color="white">{challenge.submissionKind} evidence</Badge>
            <Badge color="lavender">{challenge.verificationMode} review</Badge>
            {challenge.source === "demo" && (
              <Badge color="yellow">Demo content</Badge>
            )}
          </div>
          <p className="mb-3 flex items-center gap-2 text-sm font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white">
              {challenge.creatorInitials}
            </span>
            {challenge.creatorName}
          </p>
          <h1 className="font-display max-w-4xl text-4xl leading-tight font-bold sm:text-6xl">
            {challenge.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/70 sm:text-lg">
            {challenge.description}
          </p>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border-2 border-red-700 bg-red-50 p-4 text-sm font-bold text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-6 rounded-xl border-2 border-black bg-stage-mint p-4 text-sm font-bold">
          {notice}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <SurfaceCard className="p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">How it works</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                [
                  "01",
                  "Create",
                  `Prepare your ${challenge.submissionKind} evidence.`,
                ],
                [
                  "02",
                  "Submit",
                  challenge.requiresWorldVerification
                    ? "Verify with World and send your work."
                    : "Connect your wallet and send your work.",
                ],
                [
                  "03",
                  challenge.maxWinners > 0 ? "Review" : "Reward",
                  challenge.maxWinners > 0
                    ? "The creator manually selects the winners."
                    : "Every accepted submission earns the participation reward; no winner is selected.",
                ],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-2xl border-2 border-black bg-stage-bg p-4"
                >
                  <span className="font-display text-stage-cyan text-2xl font-bold">
                    {number}
                  </span>
                  <h3 className="mt-2 font-bold">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          {effectiveMode === "creator" ? (
            <CreatorPanel
              challenge={challenge}
              submissions={submissions}
              busy={busy}
              onTransition={(action) => void transition(action)}
              onDecision={(submission, decision) =>
                void decide(submission, decision)
              }
            />
          ) : (
            <SurfaceCard className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge color="cyan">Fan submission</Badge>
                  <h2 className="font-display mt-3 text-2xl font-bold">
                    Enter the challenge
                  </h2>
                  <p className="mt-2 text-sm text-gray-600">
                    One submission per wallet. Evidence is reviewed manually.
                  </p>
                </div>
                {challenge.requiresWorldVerification && (
                  <Badge color={worldVerified ? "mint" : "yellow"}>
                    {worldVerified ? "World verified" : "World required"}
                  </Badge>
                )}
              </div>

              {!session ? (
                <div className="mt-6 rounded-2xl border-2 border-dashed border-black p-6 text-center">
                  <p className="font-bold">
                    Connect your wallet to participate.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Use the Log in button in the header.
                  </p>
                </div>
              ) : challenge.requiresWorldVerification && !worldVerified ? (
                <Button
                  variant="holo"
                  size="lg"
                  className="mt-6"
                  onClick={beginWorldVerification}
                >
                  Verify with World
                </Button>
              ) : (
                <form
                  className="mt-6 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitEvidence();
                  }}
                >
                  {acceptsUrl && (
                    <label className="block text-sm font-bold">
                      Public evidence URL
                      <input
                        required
                        type="url"
                        value={evidenceUrl}
                        onChange={(event) => setEvidenceUrl(event.target.value)}
                        placeholder="https://..."
                        className="mt-2 w-full rounded-xl border-2 border-black bg-white px-4 py-3 font-normal"
                      />
                    </label>
                  )}
                  <label className="block text-sm font-bold">
                    {acceptsUrl
                      ? "Note to the creator (optional)"
                      : "Your entry"}
                    <textarea
                      required={!acceptsUrl}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={5}
                      maxLength={4_000}
                      className="mt-2 w-full resize-y rounded-xl border-2 border-black bg-white px-4 py-3 font-normal"
                    />
                  </label>
                  <Button
                    type="submit"
                    variant="holo"
                    size="lg"
                    disabled={!canSubmit || busy}
                  >
                    {busy ? "Submitting…" : "Submit entry"}
                  </Button>
                  {associationRequired && challenge.creatorTokenId && (
                    <Button
                      type="button"
                      variant="mint"
                      size="lg"
                      disabled={busy}
                      onClick={() => void associateRewardToken()}
                    >
                      Associate reward token
                    </Button>
                  )}
                </form>
              )}
            </SurfaceCard>
          )}
        </div>

        <aside className="space-y-5">
          <SurfaceCard className="p-5">
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
              Participation reward
            </p>
            <div className="mt-2 flex items-end gap-2">
              <ZapIcon size={30} className="text-stage-pink" />
              <span className="font-display text-4xl font-bold">
                {challenge.participationRewardAmount}
              </span>
              <span className="pb-1 text-sm font-bold text-gray-500">
                tokens
              </span>
            </div>
          </SurfaceCard>

          {challenge.maxWinners > 0 && (
            <SurfaceCard className="p-5">
              <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
                Winner reward
              </p>
              <div className="mt-2 flex items-end gap-2">
                <ZapIcon size={30} className="text-stage-pink" />
                <span className="font-display text-4xl font-bold">
                  {challenge.rewardAmount}
                </span>
                <span className="pb-1 text-sm font-bold text-gray-500">
                  tokens
                </span>
              </div>
            </SurfaceCard>
          )}

          <SurfaceCard className="divide-y-2 divide-black/10">
            <StatRow
              icon={<ClockIcon size={18} />}
              label="Deadline"
              value={timeRemaining(challenge.submissionDeadline)}
            />
            <StatRow
              icon={<UsersIcon size={18} />}
              label={challenge.maxWinners > 0 ? "Reward slots" : "Winners"}
              value={
                challenge.maxWinners > 0
                  ? `${remainingSlots} of ${challenge.maxWinners} left`
                  : "Participation only"
              }
            />
            <StatRow
              icon={<CheckIcon size={18} />}
              label="Review"
              value="Manual creator decision"
            />
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <h2 className="font-display text-lg font-bold">Timeline</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="font-bold text-gray-500">Starts</dt>
                <dd>{formatDate(challenge.startsAt)}</dd>
              </div>
              <div>
                <dt className="font-bold text-gray-500">Submission deadline</dt>
                <dd>{formatDate(challenge.submissionDeadline)}</dd>
              </div>
            </dl>
          </SurfaceCard>
        </aside>
      </div>
    </main>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-stage-aqua">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold text-gray-500">{label}</p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  );
}

function CreatorPanel({
  challenge,
  submissions,
  busy,
  onTransition,
  onDecision,
}: {
  challenge: ChallengeDetail;
  submissions: Submission[];
  busy: boolean;
  onTransition: (action: "close" | "complete" | "cancel") => void;
  onDecision: (submission: Submission, decision: "accept" | "reject") => void;
}) {
  return (
    <SurfaceCard className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge color="pink">Creator workspace</Badge>
          <h2 className="font-display mt-3 text-2xl font-bold">
            Review submissions
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {challenge.maxWinners > 0
              ? "Close entries before selecting winners. Decisions are final."
              : "Every successful submission receives the participation reward. Close and complete without selecting a winner."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {challenge.status === "published" && (
            <Button
              variant="lavender"
              size="sm"
              disabled={busy}
              onClick={() => onTransition("close")}
            >
              Close submissions
            </Button>
          )}
          {challenge.status === "judging" && (
            <Button
              variant="mint"
              size="sm"
              disabled={busy}
              onClick={() => onTransition("complete")}
            >
              Complete challenge
            </Button>
          )}
          {!["completed", "cancelled"].includes(challenge.status) && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onTransition("cancel")}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {submissions.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-black p-8 text-center">
            <p className="font-bold">No submissions yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Fan entries will appear here.
            </p>
          </div>
        ) : (
          submissions.map((submission, index) => (
            <article
              key={submission.id}
              className="rounded-2xl border-2 border-black bg-stage-bg p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-500">
                    Submission #{index + 1}
                  </p>
                  <Badge
                    color={
                      String(submission.status) === "winner"
                        ? "mint"
                        : String(submission.status) === "rejected"
                          ? "pink"
                          : "white"
                    }
                    className="mt-2"
                  >
                    {String(submission.status)}
                  </Badge>
                </div>
                {String(submission.status) === "submitted" &&
                  challenge.status === "judging" &&
                  challenge.maxWinners > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="mint"
                        size="sm"
                        disabled={busy}
                        onClick={() => onDecision(submission, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => onDecision(submission, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
              </div>
              {submission.evidenceUrl && (
                <a
                  href={submission.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block break-all text-sm font-bold underline decoration-2 underline-offset-2"
                >
                  {submission.evidenceUrl}
                </a>
              )}
              {submission.text && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                  {submission.text}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </SurfaceCard>
  );
}
