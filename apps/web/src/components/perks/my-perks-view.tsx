"use client";

import { ApiClaimService, type Claim } from "@creator-platform/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/auth-provider";
import { GiftIcon, VerifiedIcon, ZapIcon } from "../icons";
import { Badge, type BadgeColor } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

type StatusFilter = "all" | "claimed" | "fulfilled" | "cancelled";

const STATUS_DETAILS: Record<
  Claim["status"],
  {
    label: string;
    description: string;
    color: BadgeColor;
    accent: string;
  }
> = {
  claimed: {
    label: "Awaiting fulfillment",
    description:
      "Your purchase is confirmed. The creator still needs to fulfill this perk.",
    color: "yellow",
    accent: "#ffe36e",
  },
  fulfilled: {
    label: "Fulfilled",
    description: "The creator has fulfilled this perk.",
    color: "mint",
    accent: "#73f2c2",
  },
  cancelled: {
    label: "Cancelled",
    description: "This perk claim was cancelled.",
    color: "pink",
    accent: "#ff93c9",
  },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortReference(value: string): string {
  if (value.length <= 22) return value;
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

export function MyPerksView() {
  const { session, loading: authLoading } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const claimService = useMemo(
    () =>
      new ApiClaimService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );

  const loadClaims = useCallback(() => {
    if (!session) return;
    setLoading(true);
    setError(false);
    void claimService
      .listClaims({ limit: 100 })
      .then(({ items }) => {
        setClaims(
          [...items].sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          ),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [claimService, session]);

  useEffect(() => {
    if (!authLoading && session) loadClaims();
  }, [authLoading, loadClaims, session]);

  const visibleClaims =
    statusFilter === "all"
      ? claims
      : claims.filter((claim) => claim.status === statusFilter);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-black/10" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl border-2 border-black bg-white/60"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <SurfaceCard accent="#23c9ef" className="p-8 text-center sm:p-12">
          <GiftIcon size={36} className="mx-auto" />
          <h1 className="font-display mt-5 text-4xl font-bold">
            Log in to see your perks
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-gray-600">
            Purchased perks and creator fulfillment updates are private to your
            account. Use the Log in button in the header to continue.
          </p>
          <Button href="/perks" variant="holo" className="mt-7">
            Browse perks
          </Button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 pb-24">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge color="lavender">Your rewards</Badge>
          <h1 className="font-display mt-4 text-4xl font-bold sm:text-6xl">
            My perks
          </h1>
          <p className="mt-4 max-w-2xl text-gray-600">
            Follow every creator perk from confirmed purchase through
            fulfillment.
          </p>
        </div>
        <Button href="/perks" variant="holo">
          Browse more perks
        </Button>
      </div>

      {claims.length > 0 && (
        <div
          className="mt-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter purchased perks by status"
        >
          {(
            [
              ["all", "All"],
              ["claimed", "Awaiting"],
              ["fulfilled", "Fulfilled"],
              ["cancelled", "Cancelled"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className="rounded-full border-2 border-black px-4 py-2 text-sm font-bold transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black aria-pressed:bg-black aria-pressed:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl border-2 border-black bg-white/60"
            />
          ))}
        </div>
      ) : error ? (
        <SurfaceCard accent="#ff93c9" className="mt-10 p-8 text-center">
          <h2 className="font-display text-2xl font-bold">
            Your purchased perks could not be loaded
          </h2>
          <p className="mt-2 text-gray-600">
            Check that the API is running, then try again.
          </p>
          <Button className="mt-5" variant="ghost" onClick={loadClaims}>
            Try again
          </Button>
        </SurfaceCard>
      ) : claims.length === 0 ? (
        <SurfaceCard accent="#bd9cff" className="mt-10 p-10 text-center">
          <GiftIcon size={34} className="mx-auto" />
          <h2 className="font-display mt-4 text-2xl font-bold">
            No purchased perks yet
          </h2>
          <p className="mt-2 text-gray-600">
            When you spend creator tokens on a perk, its fulfillment status will
            appear here.
          </p>
          <Button href="/perks" variant="holo" className="mt-6">
            Explore perks
          </Button>
        </SurfaceCard>
      ) : visibleClaims.length === 0 ? (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-black p-10 text-center">
          <p className="font-display text-2xl font-bold">
            No perks with this status
          </p>
          <button
            type="button"
            className="mt-3 font-bold underline underline-offset-4"
            onClick={() => setStatusFilter("all")}
          >
            Show all purchased perks
          </button>
        </div>
      ) : (
        <div className="mt-10 grid items-start gap-6 md:grid-cols-2">
          {visibleClaims.map((claim) => {
            const status = STATUS_DETAILS[claim.status];
            const perkTitle = claim.perk?.title ?? "Purchased creator perk";
            return (
              <SurfaceCard
                key={claim.id}
                accent={status.accent}
                className="p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {claim.perk && (
                      <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                        {claim.perk.creatorName} · @{claim.perk.creatorHandle}
                      </p>
                    )}
                    <h2 className="font-display mt-1 text-2xl font-bold">
                      {perkTitle}
                    </h2>
                  </div>
                  <Badge color={status.color}>{status.label}</Badge>
                </div>

                {claim.perk?.description && (
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {claim.perk.description}
                  </p>
                )}

                <div className="mt-6 rounded-2xl border-2 border-black bg-black/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    {claim.status === "fulfilled" ? (
                      <VerifiedIcon size={22} className="mt-0.5 shrink-0" />
                    ) : (
                      <GiftIcon size={22} className="mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">{status.label}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {status.description}
                      </p>
                    </div>
                  </div>
                </div>

                {claim.fulfillmentNote && (
                  <div className="mt-4 rounded-2xl border-2 border-black bg-stage-mint p-4">
                    <p className="text-xs font-bold tracking-wide uppercase">
                      Message from the creator
                    </p>
                    <p className="mt-2 break-words text-sm whitespace-pre-wrap">
                      {claim.fulfillmentNote}
                    </p>
                  </div>
                )}

                <dl className="mt-5 grid gap-3 border-t-2 border-black/10 pt-5 text-sm">
                  {claim.payment && (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="flex items-center gap-1.5 text-gray-500">
                          <ZapIcon size={14} />
                          Paid
                        </dt>
                        <dd className="font-bold">
                          {claim.payment.amount}{" "}
                          {claim.perk?.tokenSymbol ?? "tokens"}
                        </dd>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-gray-500">Hedera payment</dt>
                        <dd className="min-w-0 text-right font-bold">
                          <a
                            href={`https://hashscan.io/testnet/transaction/${encodeURIComponent(
                              claim.payment.transactionReference,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all underline underline-offset-4 hover:no-underline"
                            title={claim.payment.transactionReference}
                          >
                            {shortReference(claim.payment.transactionReference)}
                          </a>
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-gray-500">Purchased</dt>
                    <dd className="text-right font-bold">
                      {formatDate(claim.createdAt)}
                    </dd>
                  </div>
                  {claim.fulfilledAt && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-gray-500">Fulfilled</dt>
                      <dd className="text-right font-bold">
                        {formatDate(claim.fulfilledAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
