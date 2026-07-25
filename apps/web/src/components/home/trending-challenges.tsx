"use client";

import type { CatalogChallenge } from "@creator-platform/api-client";
import { useEffect, useState } from "react";
import {
  catalogService,
  initials,
  mapCatalogChallenge,
} from "../../lib/catalog";
import { ClockIcon, UsersIcon, VerifiedIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function TrendingChallenges() {
  const [challenges, setChallenges] = useState<CatalogChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    catalogService
      .listChallenges()
      .then(({ items }) =>
        setChallenges(items.filter((item) => item.featured).slice(0, 3)),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section
      aria-labelledby="trending-challenges-heading"
      className="mt-16 sm:mt-20"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="trending-challenges-heading"
          className="font-display text-2xl font-bold sm:text-3xl"
        >
          Trending Challenges
        </h2>
        <Button href="/challenges" variant="ghost" size="sm">
          View all challenges
        </Button>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-3xl border-2 border-black bg-white/60" />
      ) : error ? (
        <p className="rounded-2xl border-2 border-black bg-white p-6 font-bold">
          Trending challenges could not be loaded.
        </p>
      ) : challenges.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-black p-6 text-center font-bold">
          No trending challenges yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge) => {
            const view = mapCatalogChallenge(challenge);
            return (
              <SurfaceCard key={challenge.id} accent={view.accent}>
                <div
                  className="relative flex h-32 items-center justify-center border-b-2 border-black"
                  style={{
                    background: `linear-gradient(135deg, ${view.accent}, #ffffff)`,
                  }}
                >
                  <div className="absolute top-3 left-3">
                    <Badge color="white">{view.format}</Badge>
                  </div>
                  {challenge.requiresWorldVerification && (
                    <div className="absolute top-3 right-3">
                      <Badge color="cyan">
                        <VerifiedIcon size={11} /> Verified
                      </Badge>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 text-xs font-bold text-black/70">
                    {initials(challenge.creatorName)} · {challenge.creatorName}
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="font-display mb-3 text-base leading-snug font-bold">
                    {challenge.title}
                  </h3>

                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 font-bold">
                      <ZapIcon size={13} className="text-black" />
                      {Number(challenge.rewardAmount).toLocaleString()} tokens
                      to win
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <ClockIcon size={12} /> {view.statusLabel}
                    </span>
                  </div>

                  <div className="mb-4 flex items-center gap-1 text-xs text-gray-400">
                    <UsersIcon size={12} />{" "}
                    {challenge.submissionCount.toLocaleString()} submissions
                  </div>

                  <Button
                    href={`/challenges/${challenge.id}`}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    View Challenge
                  </Button>
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
