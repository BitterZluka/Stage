"use client";

import type { CatalogPerk } from "@creator-platform/api-client";
import { useEffect, useState } from "react";
import { catalogService, perkAccent } from "../../lib/catalog";
import { GiftIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function CreatorPerks() {
  const [perks, setPerks] = useState<CatalogPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    catalogService
      .listPerks()
      .then(({ items }) =>
        setPerks(items.filter((item) => item.featured).slice(0, 4)),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section aria-labelledby="creator-perks-heading" className="mt-16 sm:mt-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="creator-perks-heading"
          className="font-display text-2xl font-bold sm:text-3xl"
        >
          Creator Perks
        </h2>
        <Button href="/perks" variant="ghost" size="sm">
          Browse all perks
        </Button>
      </div>

      {loading ? (
        <div className="h-52 animate-pulse rounded-3xl border-2 border-black bg-white/60" />
      ) : error ? (
        <p className="rounded-2xl border-2 border-black bg-white p-6 font-bold">
          Creator perks could not be loaded.
        </p>
      ) : perks.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-black p-6 text-center font-bold">
          No featured perks yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map((perk) => {
            const accent = perkAccent(perk);
            return (
              <SurfaceCard key={perk.id} accent={accent} className="p-5">
                <div
                  className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, #fff)`,
                  }}
                  aria-hidden="true"
                >
                  <GiftIcon size={18} />
                </div>
                <h3 className="font-display mb-0.5 text-base font-bold">
                  {perk.title}
                </h3>
                <p className="mb-3 text-xs text-gray-500">{perk.creatorName}</p>
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <ZapIcon size={12} />{" "}
                    {Number(perk.tokenThreshold).toLocaleString()}
                  </span>
                  <Badge color="aqua">{perk.category}</Badge>
                </div>
                <Button
                  href="/perks"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  View Perk
                </Button>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </section>
  );
}
