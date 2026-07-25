import { FEATURED_PERKS } from "../../content/homepage";
import { GiftIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function CreatorPerks() {
  return (
    <section aria-labelledby="creator-perks-heading" className="mt-16 sm:mt-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="creator-perks-heading" className="font-display text-2xl font-bold sm:text-3xl">
          Creator Perks
        </h2>
        <Button href="/perks" variant="ghost" size="sm">
          Browse all perks
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED_PERKS.map((perk) => (
          <SurfaceCard key={perk.id} accent={perk.accent} className="p-5">
            <div
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black"
              style={{ background: `linear-gradient(135deg, ${perk.accent}, #fff)` }}
              aria-hidden="true"
            >
              <GiftIcon size={18} />
            </div>
            <h3 className="font-display mb-0.5 text-base font-bold">{perk.title}</h3>
            <p className="mb-3 text-xs text-gray-500">{perk.creatorName}</p>
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-bold">
                <ZapIcon size={12} /> {perk.cost.toLocaleString()}
              </span>
              <Badge color="aqua">{perk.type}</Badge>
            </div>
            <Button href="/perks" variant="ghost" size="sm" className="w-full">
              View Perk
            </Button>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}
