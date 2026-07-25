"use client";

import type { CatalogPerk } from "@creator-platform/api-client";
import { useCallback, useEffect, useState } from "react";
import { catalogService, perkAccent } from "../../lib/catalog";
import { GiftIcon, VerifiedIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function PerksView() {
  const [perks, setPerks] = useState<CatalogPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPerks = useCallback(() => {
    setLoading(true);
    setError(false);
    catalogService
      .listPerks()
      .then(({ items }) => setPerks(items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPerks();
  }, [loadPerks]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 pb-24">
      <Badge color="pink">Creator rewards</Badge>
      <h1 className="font-display mt-4 text-4xl font-bold sm:text-6xl">
        Community perks
      </h1>
      <p className="mt-4 max-w-2xl text-gray-600">
        Discover merch, digital drops, and experiences unlocked with creator
        tokens.
      </p>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-3xl border-2 border-black bg-white/60"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-10 rounded-3xl border-2 border-black bg-white p-8 text-center shadow-offset">
          <p className="font-display text-2xl font-bold">
            Perks could not be loaded
          </p>
          <Button className="mt-5" variant="ghost" onClick={loadPerks}>
            Try again
          </Button>
        </div>
      ) : perks.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-black p-10 text-center">
          <p className="font-display text-2xl font-bold">No public perks yet</p>
          <p className="mt-2 text-gray-500">
            Creator rewards will appear here when available.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk) => {
            const remaining = Math.max(perk.inventory - perk.claimedCount, 0);
            const accent = perkAccent(perk);
            return (
              <SurfaceCard
                key={perk.id}
                accent={accent}
                className="flex flex-col p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black"
                    style={{
                      background: `linear-gradient(135deg, ${accent}, #fff)`,
                    }}
                  >
                    <GiftIcon size={20} />
                  </span>
                  <Badge color={perk.status === "active" ? "aqua" : "white"}>
                    {perk.status}
                  </Badge>
                </div>
                <p className="mt-5 text-xs font-bold text-gray-500">
                  {perk.creatorName}
                </p>
                <h2 className="font-display mt-1 text-xl font-bold">
                  {perk.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
                  {perk.description}
                </p>
                <div className="mt-6 flex items-center justify-between border-t-2 border-black/10 pt-4">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <ZapIcon size={14} />
                    {Number(perk.tokenThreshold).toLocaleString()}{" "}
                    {perk.tokenSymbol}
                  </span>
                  <Badge color="lavender">{perk.category}</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                  {perk.requiresWorldVerification && <VerifiedIcon size={12} />}
                  {remaining} remaining
                  {perk.requiresWorldVerification ? " · World verified" : ""}
                </p>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </main>
  );
}
