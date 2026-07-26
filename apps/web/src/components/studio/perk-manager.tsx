"use client";

import {
  ApiClientError,
  ApiClaimService,
  ApiPerkService,
  type Claim,
  type Perk,
} from "@creator-platform/api-client";
import {
  ClaimStatus,
  PerkStatus,
  type CreatorId,
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

type PerkFilter = "all" | PerkStatus;

interface PerkFormValue {
  title: string;
  description: string;
  tokenThreshold: string;
  inventory: number;
  requiresWorldVerification: boolean;
}

const STATUS_FILTERS: { value: PerkFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: PerkStatus.Draft, label: "Drafts" },
  { value: PerkStatus.Active, label: "Active" },
  { value: PerkStatus.Paused, label: "Paused" },
  { value: PerkStatus.Exhausted, label: "Exhausted" },
];

const STATUS_COLORS: Record<PerkStatus, BadgeColor> = {
  [PerkStatus.Draft]: "yellow",
  [PerkStatus.Active]: "mint",
  [PerkStatus.Paused]: "lavender",
  [PerkStatus.Exhausted]: "pink",
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function errorMessage(cause: unknown): string {
  if (cause instanceof ApiClientError) {
    if (cause.code === "VERSION_CONFLICT") {
      return "This perk changed in another request. Refresh and try again.";
    }
    if (cause.code === "PERK_NOT_DRAFT") {
      return "Only draft perks can be edited or deleted.";
    }
    if (cause.code === "CREATOR_TOKEN_NOT_ACTIVE") {
      return "Your creator token must be active on Hedera before this perk can go live.";
    }
    if (cause.code === "INVALID_PERK_TRANSITION") {
      return "This perk cannot make that lifecycle change.";
    }
    return cause.message;
  }
  return cause instanceof Error ? cause.message : "The request failed.";
}

export function PerkManager() {
  const { session } = useAuth();
  const creatorId = session?.user.creatorId ?? null;
  const service = useMemo(
    () =>
      new ApiPerkService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const claimService = useMemo(
    () =>
      new ApiClaimService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PerkFilter>("all");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Perk | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Perk | null>(null);
  const [claimTarget, setClaimTarget] = useState<Perk | null>(null);

  const loadPerks = useCallback(async () => {
    if (!creatorId) return;
    setLoading(true);
    setError(null);
    try {
      const page = await service.listMyPerks({ limit: 100 });
      setPerks(
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
    void loadPerks();
  }, [loadPerks]);

  const visiblePerks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return perks.filter(
      (perk) =>
        (filter === "all" || perk.status === filter) &&
        (!term ||
          perk.title.toLowerCase().includes(term) ||
          perk.description.toLowerCase().includes(term)),
    );
  }, [filter, perks, search]);

  const counts = useMemo(
    () => ({
      total: perks.length,
      active: perks.filter((perk) => perk.status === PerkStatus.Active).length,
      drafts: perks.filter((perk) => perk.status === PerkStatus.Draft).length,
      claims: perks.reduce((total, perk) => total + perk.claimedCount, 0),
    }),
    [perks],
  );

  function replacePerk(updated: Perk) {
    setPerks((current) =>
      current.map((perk) => (perk.id === updated.id ? updated : perk)),
    );
  }

  async function savePerk(value: PerkFormValue) {
    if (!creatorId) return;
    setBusyId(editor === "new" ? "create" : (editor?.id ?? "create"));
    setError(null);
    try {
      if (editor === "new") {
        const created = await service.createPerk({
          creatorId: creatorId as CreatorId,
          title: value.title,
          description: value.description,
          tokenThreshold: value.tokenThreshold as TokenAmount,
          inventory: value.inventory,
          requiresWorldVerification: value.requiresWorldVerification,
        });
        setPerks((current) => [created, ...current]);
      } else if (editor) {
        const updated = await service.updatePerk(editor.id, {
          title: value.title,
          description: value.description,
          tokenThreshold: value.tokenThreshold as TokenAmount,
          inventory: value.inventory,
          requiresWorldVerification: value.requiresWorldVerification,
          expectedVersion: editor.version,
        });
        replacePerk(updated);
      }
      setEditor(null);
    } catch (cause) {
      throw new Error(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function transition(
    perk: Perk,
    action: "activate" | "pause" | "resume",
  ) {
    setBusyId(perk.id);
    setError(null);
    try {
      const updated =
        action === "activate"
          ? await service.activatePerk(perk.id, perk.version)
          : action === "pause"
            ? await service.pausePerk(perk.id, perk.version)
            : await service.resumePerk(perk.id, perk.version);
      replacePerk(updated);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDraft(perk: Perk) {
    setBusyId(perk.id);
    setError(null);
    try {
      await service.deletePerk(perk.id, perk.version);
      setPerks((current) => current.filter((item) => item.id !== perk.id));
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
            Member rewards desk
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold">Your perks</h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Create token-gated benefits, control inventory, and publish an
            auditable activation through Hedera.
          </p>
        </div>
        <Button variant="holo" size="lg" onClick={() => setEditor("new")}>
          + Create perk
        </Button>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StudioMetric label="Total" value={counts.total} accent="stage-aqua" />
        <StudioMetric
          label="Active"
          value={counts.active}
          accent="stage-mint"
        />
        <StudioMetric
          label="Drafts"
          value={counts.drafts}
          accent="stage-yellow"
        />
        <StudioMetric
          label="Claims"
          value={counts.claims}
          accent="stage-pink"
        />
      </dl>

      <div className="mt-8 rounded-2xl border-2 border-black bg-stage-lavender/45 p-4">
        <p className="font-bold">Hedera-backed purchases</p>
        <p className="mt-1 text-sm text-gray-700">
          Activation requires your live creator token. A claim is created only
          after Mirror Node confirms that the member transferred the exact perk
          price back to the Stage treasury.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-2xl border-2 border-black bg-white p-4 shadow-offset lg:flex-row lg:items-center lg:justify-between">
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
          <span className="sr-only">Search your perks</span>
          <SearchIcon
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your perks"
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
      ) : visiblePerks.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {visiblePerks.map((perk) => (
            <ManagedPerkCard
              key={perk.id}
              perk={perk}
              busy={busyId === perk.id}
              onEdit={() => setEditor(perk)}
              onDelete={() => setDeleteTarget(perk)}
              onClaims={() => setClaimTarget(perk)}
              onTransition={(action) => void transition(perk, action)}
            />
          ))}
        </div>
      ) : (
        <SurfaceCard
          accent="var(--color-stage-cyan)"
          className="mt-8 p-10 text-center"
        >
          <h3 className="font-display text-2xl font-bold">
            {perks.length
              ? "No perks match this view"
              : "Create your first perk"}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-gray-600">
            {perks.length
              ? "Change the status filter or search term to see more."
              : "Begin with a private draft, set the token threshold, and activate it when the benefit is ready."}
          </p>
          {!perks.length && (
            <Button
              variant="holo"
              className="mt-6"
              onClick={() => setEditor("new")}
            >
              + Create perk
            </Button>
          )}
        </SurfaceCard>
      )}

      {editor && (
        <PerkEditor
          key={editor === "new" ? "new" : editor.id}
          perk={editor === "new" ? null : editor}
          submitting={busyId === (editor === "new" ? "create" : editor.id)}
          onClose={() => setEditor(null)}
          onSave={savePerk}
        />
      )}

      {deleteTarget && (
        <DeletePerkDialog
          perk={deleteTarget}
          deleting={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteDraft(deleteTarget)}
        />
      )}

      {claimTarget && (
        <PerkClaimsDialog
          perk={claimTarget}
          service={claimService}
          onClose={() => setClaimTarget(null)}
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

function ManagedPerkCard({
  perk,
  busy,
  onEdit,
  onDelete,
  onClaims,
  onTransition,
}: {
  perk: Perk;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClaims: () => void;
  onTransition: (action: "activate" | "pause" | "resume") => void;
}) {
  const remaining = Math.max(0, perk.inventory - perk.claimedCount);
  return (
    <SurfaceCard
      accent={
        perk.status === PerkStatus.Active
          ? "var(--color-stage-mint)"
          : "var(--color-stage-lavender)"
      }
      className="flex flex-col"
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-white p-5">
        <div className="min-w-0">
          <Badge color={STATUS_COLORS[perk.status]}>
            {formatStatus(perk.status)}
          </Badge>
          <h3 className="font-display mt-3 text-xl font-bold">{perk.title}</h3>
        </div>
        <span className="rounded-lg border-2 border-black bg-stage-aqua px-2 py-1 text-xs font-bold">
          HTS GATE
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm text-gray-600">{perk.description}</p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y-2 border-black/10 py-4 text-sm">
          <div>
            <dt className="text-xs font-bold text-gray-500 uppercase">
              Token price
            </dt>
            <dd className="mt-1 font-bold">
              {perk.tokenThreshold} creator tokens
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-gray-500 uppercase">
              Inventory
            </dt>
            <dd className="mt-1 font-bold">
              {remaining} remaining · {perk.claimedCount}/{perk.inventory}{" "}
              claimed
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold text-gray-500 uppercase">
              Eligibility
            </dt>
            <dd className="mt-1 font-bold">
              {perk.requiresWorldVerification
                ? "Creator tokens + World-verified member"
                : "Creator-token balance"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {perk.status !== PerkStatus.Draft && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClaims}
              disabled={busy}
            >
              Manage claims ({perk.claimedCount})
            </Button>
          )}
          {perk.status === PerkStatus.Draft && (
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
                onClick={() => onTransition("activate")}
                disabled={busy}
              >
                {busy ? "Working…" : "Activate on Hedera"}
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
          {perk.status === PerkStatus.Active && (
            <Button
              variant="lavender"
              size="sm"
              onClick={() => onTransition("pause")}
              disabled={busy}
            >
              {busy ? "Working…" : "Pause claims"}
            </Button>
          )}
          {perk.status === PerkStatus.Paused && (
            <Button
              variant="mint"
              size="sm"
              onClick={() => onTransition("resume")}
              disabled={busy}
            >
              {busy ? "Working…" : "Resume claims"}
            </Button>
          )}
          {perk.status === PerkStatus.Exhausted && (
            <p className="text-sm font-bold text-gray-500">
              Inventory is exhausted. This perk is read-only.
            </p>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function PerkClaimsDialog({
  perk,
  service,
  onClose,
}: {
  perk: Perk;
  service: ApiClaimService;
  onClose: () => void;
}) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyClaimId, setBusyClaimId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadClaims() {
      setLoading(true);
      setClaimError(null);
      try {
        const page = await service.listPerkClaims(perk.id, { limit: 100 });
        if (active) setClaims(page.items);
      } catch (cause) {
        if (active) setClaimError(errorMessage(cause));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadClaims();
    return () => {
      active = false;
    };
  }, [perk.id, service]);

  async function fulfill(claim: Claim) {
    setBusyClaimId(claim.id);
    setClaimError(null);
    try {
      const note = notes[claim.id]?.trim();
      const updated = await service.fulfillClaim(claim.id, {
        expectedVersion: claim.version,
        ...(note ? { note } : {}),
      });
      setClaims((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (cause) {
      setClaimError(errorMessage(cause));
    } finally {
      setBusyClaimId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="perk-claims-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border-2 border-black bg-white shadow-offset"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-2 border-black bg-gradient-to-r from-stage-aqua to-stage-lavender p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase">
              Fulfillment desk
            </p>
            <h2
              id="perk-claims-title"
              className="font-display mt-1 text-2xl font-bold"
            >
              {perk.title}
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              {perk.claimedCount} of {perk.inventory} claims reserved
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close claims"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:p-6">
          <div className="rounded-2xl border-2 border-black bg-stage-mint/35 p-4 text-sm">
            Marking a claim fulfilled updates Stage immediately and queues a
            redacted HCS audit event. Fulfillment details stay in PostgreSQL and
            are not published to Hedera.
          </div>

          {claimError && (
            <p
              role="alert"
              className="rounded-xl border-2 border-black bg-stage-pink p-3 text-sm font-bold"
            >
              {claimError}
            </p>
          )}

          {loading ? (
            <div className="h-36 animate-pulse rounded-2xl border-2 border-black bg-gray-100" />
          ) : claims.length ? (
            claims.map((claim) => (
              <article
                key={claim.id}
                className="rounded-2xl border-2 border-black p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge
                      color={
                        claim.status === ClaimStatus.Fulfilled
                          ? "mint"
                          : claim.status === ClaimStatus.Cancelled
                            ? "pink"
                            : "yellow"
                      }
                    >
                      {formatStatus(claim.status)}
                    </Badge>
                    <p className="mt-2 text-sm font-bold">
                      Member {shortId(claim.claimantId)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Claimed {new Date(claim.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {claim.fulfilledAt && (
                    <p className="text-xs text-gray-500">
                      Fulfilled {new Date(claim.fulfilledAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {claim.status === ClaimStatus.Claimed ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="grid gap-1.5 text-xs font-bold uppercase">
                      Optional private note
                      <input
                        maxLength={1_000}
                        value={notes[claim.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [claim.id]: event.target.value,
                          }))
                        }
                        placeholder="Delivery reference or internal note"
                        className="rounded-xl border-2 border-black px-3 py-2.5 text-sm font-normal normal-case"
                      />
                    </label>
                    <Button
                      variant="mint"
                      size="sm"
                      disabled={busyClaimId === claim.id}
                      onClick={() => void fulfill(claim)}
                    >
                      {busyClaimId === claim.id
                        ? "Recording…"
                        : "Mark fulfilled"}
                    </Button>
                  </div>
                ) : (
                  claim.fulfillmentNote && (
                    <p className="mt-3 rounded-xl bg-gray-100 p-3 text-sm">
                      {claim.fulfillmentNote}
                    </p>
                  )
                )}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-black p-8 text-center">
              <p className="font-bold">No claims yet</p>
              <p className="mt-1 text-sm text-gray-600">
                Eligible members will appear here after claiming this perk.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function shortId(value: string): string {
  return value.length <= 14 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function PerkEditor({
  perk,
  submitting,
  onClose,
  onSave,
}: {
  perk: Perk | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (value: PerkFormValue) => Promise<void>;
}) {
  const [title, setTitle] = useState(perk?.title ?? "");
  const [description, setDescription] = useState(perk?.description ?? "");
  const [tokenThreshold, setTokenThreshold] = useState(
    perk?.tokenThreshold ?? "100",
  );
  const [inventory, setInventory] = useState(String(perk?.inventory ?? 25));
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!/^[1-9]\d*$/.test(tokenThreshold)) {
      setFormError("Token threshold must be a positive whole number.");
      return;
    }
    const inventoryValue = Number(inventory);
    if (
      !Number.isInteger(inventoryValue) ||
      inventoryValue < 1 ||
      inventoryValue > 10_000
    ) {
      setFormError("Inventory must be between 1 and 10,000.");
      return;
    }
    if (perk && inventoryValue < perk.claimedCount) {
      setFormError("Inventory cannot be lower than existing claims.");
      return;
    }
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        tokenThreshold,
        inventory: inventoryValue,
        requiresWorldVerification: perk?.requiresWorldVerification ?? true,
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
        aria-labelledby="perk-editor-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-black bg-white shadow-offset"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-2 border-black bg-gradient-to-r from-stage-lavender to-stage-mint p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase">
              {perk ? "Edit private draft" : "New private draft"}
            </p>
            <h2
              id="perk-editor-title"
              className="font-display mt-1 text-2xl font-bold"
            >
              {perk ? "Update perk" : "Create perk"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close perk editor"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <form className="grid gap-5 p-5 sm:p-6" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-bold">
            Perk title
            <input
              required
              minLength={3}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Private livestream access"
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
              placeholder="Describe the benefit and how members will receive it."
              className="resize-y rounded-xl border-2 border-black px-4 py-3 font-normal"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold">
              Price in creator tokens
              <input
                required
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                value={tokenThreshold}
                onChange={(event) => setTokenThreshold(event.target.value)}
                className="rounded-xl border-2 border-black px-4 py-3 font-normal"
              />
              <span className="text-xs font-normal text-gray-500">
                Members spend this amount when purchasing the perk.
              </span>
            </label>

            <label className="grid gap-1.5 text-sm font-bold">
              Available claims
              <input
                required
                type="number"
                min={Math.max(1, perk?.claimedCount ?? 1)}
                max={10_000}
                value={inventory}
                onChange={(event) => setInventory(event.target.value)}
                className="rounded-xl border-2 border-black px-4 py-3 font-normal"
              />
              <span className="text-xs font-normal text-gray-500">
                Inventory is reserved atomically by the API.
              </span>
            </label>
          </div>

          <div className="rounded-2xl border-2 border-black bg-stage-aqua/35 p-4">
            <p className="font-bold">Member verification included</p>
            <p className="mt-1 text-sm text-gray-700">
              Purchases require the member&apos;s logged-in World verification
              and a confirmed Hedera token transfer. Proof material is never
              sent to Hedera.
            </p>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-xl border-2 border-black bg-stage-pink p-3 text-sm font-bold"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="holo" disabled={submitting}>
              {submitting ? "Saving…" : perk ? "Save draft" : "Create draft"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DeletePerkDialog({
  perk,
  deleting,
  onCancel,
  onConfirm,
}: {
  perk: Perk;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <SurfaceCard
        accent="var(--color-stage-pink)"
        className="w-full max-w-lg p-6"
      >
        <p className="text-xs font-bold tracking-[0.2em] uppercase">
          Delete private draft
        </p>
        <h2 className="font-display mt-2 text-2xl font-bold">{perk.title}</h2>
        <p className="mt-3 text-gray-600">
          This permanently removes the draft. Activated perks and their claim
          history cannot be deleted.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={deleting}>
            Keep draft
          </Button>
          <Button variant="pink" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete draft"}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
