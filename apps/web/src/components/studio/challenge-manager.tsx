"use client";

import {
  ApiChallengeService,
  ApiClientError,
  type Challenge,
} from "@creator-platform/api-client";
import {
  ChallengeStatus,
  SubmissionKind,
  VerificationMode,
  type CreatorId,
  type IsoTimestamp,
  type TokenAmount,
} from "@creator-platform/shared";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../../auth/auth-provider";
import { CloseIcon, SearchIcon } from "../icons";
import { Badge, type BadgeColor } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

type ChallengeFilter = "all" | ChallengeStatus;

interface ChallengeFormValue {
  title: string;
  description: string;
  submissionKind: Challenge["submissionKind"];
  startsAt: IsoTimestamp;
  submissionDeadline: IsoTimestamp;
  participationRewardAmount: string;
  rewardAmount: string;
  maxWinners: number;
}

const STATUS_FILTERS: { value: ChallengeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: ChallengeStatus.Draft, label: "Drafts" },
  { value: ChallengeStatus.Published, label: "Published" },
  { value: ChallengeStatus.Judging, label: "Judging" },
  { value: ChallengeStatus.Completed, label: "Completed" },
  { value: ChallengeStatus.Cancelled, label: "Cancelled" },
];

const STATUS_COLORS: Record<ChallengeStatus, BadgeColor> = {
  [ChallengeStatus.Draft]: "yellow",
  [ChallengeStatus.Published]: "mint",
  [ChallengeStatus.Judging]: "pink",
  [ChallengeStatus.Completed]: "cyan",
  [ChallengeStatus.Cancelled]: "white",
};

function formatStatus(status: Challenge["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function toDateTimeLocal(timestamp: string): string {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultLocalDate(offsetMilliseconds: number): string {
  return toDateTimeLocal(
    new Date(Date.now() + offsetMilliseconds).toISOString(),
  );
}

function errorMessage(cause: unknown): string {
  if (cause instanceof ApiClientError) {
    if (cause.code === "VERSION_CONFLICT") {
      return "This challenge changed in another request. Refresh and try again.";
    }
    if (cause.code === "CHALLENGE_NOT_DRAFT") {
      return "Only draft challenges can be edited or deleted.";
    }
    if (cause.code === "INVALID_CHALLENGE_DATES") {
      return "Choose a future deadline that is later than the start time.";
    }
    return cause.message;
  }
  return cause instanceof Error ? cause.message : "The request failed.";
}

export function ChallengeManager() {
  const { session } = useAuth();
  const creatorId = session?.user.creatorId ?? null;
  const service = useMemo(
    () =>
      new ApiChallengeService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChallengeFilter>("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Challenge | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  const loadChallenges = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await service.listMyChallenges({ limit: 100 });
      setChallenges(
        [...page.items].sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime(),
        ),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [creatorId, service]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const visibleChallenges = useMemo(() => {
    const term = search.trim().toLowerCase();
    return challenges.filter(
      (challenge) =>
        (filter === "all" || challenge.status === filter) &&
        (!term ||
          challenge.title.toLowerCase().includes(term) ||
          challenge.description.toLowerCase().includes(term)),
    );
  }, [challenges, filter, search]);

  const counts = useMemo(
    () => ({
      total: challenges.length,
      live: challenges.filter((challenge) => challenge.status === "published")
        .length,
      drafts: challenges.filter((challenge) => challenge.status === "draft")
        .length,
      submissions: challenges.reduce(
        (total, challenge) => total + challenge.winnerCount,
        0,
      ),
    }),
    [challenges],
  );

  function replaceChallenge(updated: Challenge) {
    setChallenges((current) =>
      current.map((challenge) =>
        challenge.id === updated.id ? updated : challenge,
      ),
    );
  }

  async function saveChallenge(value: ChallengeFormValue) {
    if (!creatorId) return;
    setBusyId(editor === "new" ? "create" : (editor?.id ?? "create"));
    setError(null);
    try {
      if (editor === "new") {
        const created = await service.createChallenge({
          creatorId: creatorId as CreatorId,
          title: value.title,
          description: value.description,
          submissionKind: value.submissionKind,
          verificationMode: VerificationMode.Manual,
          startsAt: value.startsAt,
          submissionDeadline: value.submissionDeadline,
          participationRewardAmount:
            value.participationRewardAmount as TokenAmount,
          rewardAmount: value.rewardAmount as TokenAmount,
          maxWinners: value.maxWinners,
          participationTokenAmount: "0" as TokenAmount,
        });
        setChallenges((current) => [created, ...current]);
      } else if (editor) {
        const updated = await service.updateChallenge(editor.id, {
          title: value.title,
          description: value.description,
          startsAt: value.startsAt,
          submissionDeadline: value.submissionDeadline,
          participationRewardAmount:
            value.participationRewardAmount as TokenAmount,
          rewardAmount: value.rewardAmount as TokenAmount,
          maxWinners: value.maxWinners,
          participationTokenAmount: "0" as TokenAmount,
          expectedVersion: editor.version,
        });
        replaceChallenge(updated);
      }
      setEditor(null);
    } catch (cause) {
      throw new Error(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function transition(
    challenge: Challenge,
    action: "publish" | "close" | "complete" | "cancel",
  ) {
    setBusyId(challenge.id);
    setError(null);
    try {
      const updated =
        action === "publish"
          ? await service.publishChallenge(challenge.id)
          : action === "close"
            ? await service.closeChallenge(challenge.id)
            : action === "complete"
              ? await service.completeChallenge(challenge.id)
              : await service.cancelChallenge(challenge.id);
      replaceChallenge(updated);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDraft(challenge: Challenge) {
    setBusyId(challenge.id);
    setError(null);
    try {
      await service.deleteChallenge(challenge.id, challenge.version);
      setChallenges((current) =>
        current.filter((item) => item.id !== challenge.id),
      );
      setDeleteTarget(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase">
            Challenge control room
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold">
            Your challenges
          </h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Create drafts, update their details, publish when ready, and manage
            every challenge from one place.
          </p>
        </div>
        <Button variant="holo" size="lg" onClick={() => setEditor("new")}>
          + Create challenge
        </Button>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StudioMetric label="Total" value={counts.total} accent="stage-aqua" />
        <StudioMetric
          label="Published"
          value={counts.live}
          accent="stage-mint"
        />
        <StudioMetric
          label="Drafts"
          value={counts.drafts}
          accent="stage-yellow"
        />
        <StudioMetric
          label="Winners selected"
          value={counts.submissions}
          accent="stage-pink"
        />
      </dl>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-offset lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className="shrink-0 rounded-xl border-2 border-black px-3 py-2 text-sm font-bold transition-colors aria-pressed:bg-black aria-pressed:text-white"
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search your challenges</span>
          <SearchIcon
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your challenges"
            className="w-full rounded-xl border-2 border-black py-2.5 pr-3 pl-10 text-sm"
          />
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start justify-between gap-4 rounded-2xl border-2 border-black bg-stage-pink p-4"
        >
          <p className="font-bold">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl border-2 border-black bg-white/70"
            />
          ))}
        </div>
      ) : visibleChallenges.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {visibleChallenges.map((challenge) => (
            <ManagedChallengeCard
              key={challenge.id}
              challenge={challenge}
              busy={busyId === challenge.id}
              onEdit={() => setEditor(challenge)}
              onDelete={() => setDeleteTarget(challenge)}
              onTransition={(action) => void transition(challenge, action)}
            />
          ))}
        </div>
      ) : (
        <SurfaceCard
          accent="var(--color-stage-cyan)"
          className="mt-8 p-10 text-center"
        >
          <h3 className="font-display text-2xl font-bold">
            {challenges.length
              ? "No challenges match this view"
              : "Create your first challenge"}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-gray-600">
            {challenges.length
              ? "Change the status filter or search term to see more."
              : "Start with a private draft. You can review every detail before publishing it."}
          </p>
          {!challenges.length && (
            <Button
              variant="holo"
              className="mt-6"
              onClick={() => setEditor("new")}
            >
              + Create challenge
            </Button>
          )}
        </SurfaceCard>
      )}

      {editor && (
        <ChallengeEditor
          key={editor === "new" ? "new" : editor.id}
          challenge={editor === "new" ? null : editor}
          submitting={busyId === (editor === "new" ? "create" : editor.id)}
          onClose={() => setEditor(null)}
          onSave={saveChallenge}
        />
      )}

      {deleteTarget && (
        <DeleteChallengeDialog
          challenge={deleteTarget}
          deleting={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteDraft(deleteTarget)}
        />
      )}
    </div>
  );
}

function StudioMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "stage-aqua" | "stage-mint" | "stage-yellow" | "stage-pink";
}) {
  const accentClasses = {
    "stage-aqua": "bg-stage-aqua",
    "stage-mint": "bg-stage-mint",
    "stage-yellow": "bg-stage-yellow",
    "stage-pink": "bg-stage-pink",
  } as const;

  return (
    <div
      className={`rounded-2xl border-2 border-black p-4 shadow-offset ${accentClasses[accent]}`}
    >
      <dt className="text-xs font-bold tracking-[0.14em] uppercase">{label}</dt>
      <dd className="font-display mt-1 text-3xl font-bold">{value}</dd>
    </div>
  );
}

function ManagedChallengeCard({
  challenge,
  busy,
  onEdit,
  onDelete,
  onTransition,
}: {
  challenge: Challenge;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTransition: (action: "publish" | "close" | "complete" | "cancel") => void;
}) {
  return (
    <SurfaceCard
      accent={
        challenge.status === "published"
          ? "var(--color-stage-mint)"
          : "var(--color-stage-lavender)"
      }
      className="flex flex-col"
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-white p-5">
        <div className="min-w-0">
          <Badge color={STATUS_COLORS[challenge.status]}>
            {formatStatus(challenge.status)}
          </Badge>
          <h3 className="font-display mt-3 text-xl font-bold">
            {challenge.title}
          </h3>
        </div>
        <span className="rounded-lg border-2 border-black bg-stage-aqua px-2 py-1 text-xs font-bold uppercase">
          {challenge.submissionKind}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm text-gray-600">
          {challenge.description}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y-2 border-black/10 py-4 text-sm">
          <div>
            <dt className="text-xs font-bold text-gray-500 uppercase">
              Participation reward
            </dt>
            <dd className="mt-1 font-bold">
              {challenge.participationRewardAmount} credits
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-gray-500 uppercase">
              Winner reward
            </dt>
            <dd className="mt-1 font-bold">
              {challenge.maxWinners === 0
                ? "No winner selection"
                : `${challenge.rewardAmount} credits · ${challenge.winnerCount}/${challenge.maxWinners}`}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold text-gray-500 uppercase">
              Submission deadline
            </dt>
            <dd className="mt-1 font-bold">
              {formatDate(challenge.submissionDeadline)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {challenge.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                disabled={busy}
              >
                Edit
              </Button>
              <Button
                variant="mint"
                size="sm"
                onClick={() => onTransition("publish")}
                disabled={busy}
              >
                {busy ? "Working…" : "Publish"}
              </Button>
              <Button
                variant="pink"
                size="sm"
                onClick={onDelete}
                disabled={busy}
              >
                Delete
              </Button>
            </>
          )}
          {challenge.status === "published" && (
            <>
              <Button
                variant="lavender"
                size="sm"
                onClick={() => onTransition("close")}
                disabled={busy}
              >
                {busy ? "Working…" : "Close submissions"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTransition("cancel")}
                disabled={busy}
              >
                Cancel challenge
              </Button>
            </>
          )}
          {challenge.status === "judging" && (
            <>
              <Button
                variant="cyan"
                size="sm"
                onClick={() => onTransition("complete")}
                disabled={busy}
              >
                {busy ? "Working…" : "Mark completed"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTransition("cancel")}
                disabled={busy}
              >
                Cancel challenge
              </Button>
            </>
          )}
          {(challenge.status === "completed" ||
            challenge.status === "cancelled") && (
            <p className="text-sm font-bold text-gray-500">
              This challenge is read-only.
            </p>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function ChallengeEditor({
  challenge,
  submitting,
  onClose,
  onSave,
}: {
  challenge: Challenge | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (value: ChallengeFormValue) => Promise<void>;
}) {
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [submissionKind, setSubmissionKind] = useState<
    Challenge["submissionKind"]
  >(challenge?.submissionKind ?? SubmissionKind.Image);
  const [startsAt, setStartsAt] = useState(
    challenge
      ? toDateTimeLocal(challenge.startsAt)
      : defaultLocalDate(15 * 60_000),
  );
  const [submissionDeadline, setSubmissionDeadline] = useState(
    challenge
      ? toDateTimeLocal(challenge.submissionDeadline)
      : defaultLocalDate(7 * 24 * 60 * 60_000),
  );
  const [participationRewardAmount, setParticipationRewardAmount] = useState(
    challenge?.participationRewardAmount ?? "25",
  );
  const [winnerRewardEnabled, setWinnerRewardEnabled] = useState(
    challenge ? challenge.maxWinners > 0 : true,
  );
  const [rewardAmount, setRewardAmount] = useState(
    challenge?.rewardAmount ?? "100",
  );
  const [maxWinners, setMaxWinners] = useState(
    String(challenge?.maxWinners ?? 1),
  );
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (new Date(startsAt) >= new Date(submissionDeadline)) {
      setFormError("The submission deadline must be after the start time.");
      return;
    }
    if (!winnerRewardEnabled && participationRewardAmount === "0") {
      setFormError(
        "Set a participation reward when winner selection is disabled.",
      );
      return;
    }
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        submissionKind,
        startsAt: new Date(startsAt).toISOString() as IsoTimestamp,
        submissionDeadline: new Date(
          submissionDeadline,
        ).toISOString() as IsoTimestamp,
        participationRewardAmount,
        rewardAmount: winnerRewardEnabled ? rewardAmount : "0",
        maxWinners: winnerRewardEnabled ? Number(maxWinners) : 0,
      });
    } catch (cause) {
      setFormError(errorMessage(cause));
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="challenge-editor-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-black bg-white shadow-offset"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-2 border-black bg-gradient-to-r from-stage-aqua to-stage-pink p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase">
              {challenge ? "Edit private draft" : "New private draft"}
            </p>
            <h2
              id="challenge-editor-title"
              className="font-display mt-1 text-2xl font-bold"
            >
              {challenge ? "Update challenge" : "Create challenge"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close challenge editor"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <form className="grid gap-5 p-5 sm:p-6" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-bold">
            Challenge title
            <input
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Design the cover for my next single"
              className="rounded-xl border-2 border-black px-4 py-3 font-normal"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Description
            <textarea
              required
              minLength={3}
              maxLength={4000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell your community what to create and how you will judge it."
              className="resize-y rounded-xl border-2 border-black px-4 py-3 font-normal"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Submission format
            <select
              value={submissionKind}
              disabled={challenge !== null}
              onChange={(event) =>
                setSubmissionKind(event.target.value as SubmissionKind)
              }
              className="rounded-xl border-2 border-black bg-white px-4 py-3 font-normal disabled:bg-gray-100"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="text">Text</option>
              <option value="link">Link</option>
            </select>
            {challenge && (
              <span className="text-xs font-normal text-gray-500">
                Submission format cannot change after draft creation.
              </span>
            )}
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">
              Starts at
              <input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="rounded-xl border-2 border-black px-4 py-3 font-normal"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Submission deadline
              <input
                required
                type="datetime-local"
                value={submissionDeadline}
                onChange={(event) => setSubmissionDeadline(event.target.value)}
                className="rounded-xl border-2 border-black px-4 py-3 font-normal"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-bold">
            Participation reward per accepted submission
            <input
              required
              inputMode="numeric"
              pattern="0|[1-9][0-9]*"
              value={participationRewardAmount}
              onChange={(event) =>
                setParticipationRewardAmount(event.target.value)
              }
              className="rounded-xl border-2 border-black px-4 py-3 font-normal"
            />
            <span className="text-xs font-normal text-gray-500">
              Every user who successfully submits receives this many creator
              tokens, whether or not they win.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border-2 border-black bg-stage-yellow p-4 font-bold">
            <input
              type="checkbox"
              checked={winnerRewardEnabled}
              onChange={(event) => setWinnerRewardEnabled(event.target.checked)}
              className="mt-1 h-5 w-5 accent-black"
            />
            <span>
              Also select winners
              <span className="mt-1 block text-xs font-normal text-gray-700">
                Turn this off for participation-only challenges with no winner.
              </span>
            </span>
          </label>

          {winnerRewardEnabled && (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold">
                Reward per winner
                <input
                  required
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  value={rewardAmount}
                  onChange={(event) => setRewardAmount(event.target.value)}
                  className="rounded-xl border-2 border-black px-4 py-3 font-normal"
                />
                <span className="text-xs font-normal text-gray-500">
                  Enter the reward in the token&apos;s smallest unit.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-bold">
                Maximum winners
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  value={maxWinners}
                  onChange={(event) => setMaxWinners(event.target.value)}
                  className="rounded-xl border-2 border-black px-4 py-3 font-normal"
                />
              </label>
            </div>
          )}

          {formError && (
            <p
              role="alert"
              className="rounded-xl border-2 border-black bg-stage-pink p-3 text-sm font-bold"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t-2 border-black/10 pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="holo" disabled={submitting}>
              {submitting
                ? "Saving…"
                : challenge
                  ? "Save changes"
                  : "Create draft"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteChallengeDialog({
  challenge,
  deleting,
  onCancel,
  onConfirm,
}: {
  challenge: Challenge;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-challenge-title"
        className="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 shadow-offset"
      >
        <Badge color="pink">Permanent action</Badge>
        <h2
          id="delete-challenge-title"
          className="font-display mt-4 text-2xl font-bold"
        >
          Delete this draft?
        </h2>
        <p className="mt-3 text-gray-600">
          <strong className="text-black">{challenge.title}</strong> will be
          permanently removed. Published challenges cannot be deleted; they
          remain part of the public audit history.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>
            Keep draft
          </Button>
          <Button variant="pink" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </section>
    </div>
  );
}
