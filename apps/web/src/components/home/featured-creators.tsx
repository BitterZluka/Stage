import { FEATURED_CREATORS } from "../../content/homepage";
import { UsersIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function FeaturedCreators() {
  return (
    <section aria-labelledby="featured-creators-heading" className="mt-16 sm:mt-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="featured-creators-heading" className="font-display text-2xl font-bold sm:text-3xl">
          Featured Creators
        </h2>
        <Button href="/creators" variant="ghost" size="sm">
          Browse all creators
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_CREATORS.map((creator) => (
          <SurfaceCard key={creator.id} accent={creator.accent} className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-black font-display text-lg font-bold shadow-offset"
                style={{
                  background: `linear-gradient(135deg, ${creator.accent}, #fff)`,
                }}
                aria-hidden="true"
              >
                {creator.initials}
              </div>
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-bold">{creator.name}</div>
                <div className="truncate text-xs text-gray-500">{creator.username}</div>
                <Badge color="lavender" className="mt-1">
                  {creator.category}
                </Badge>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-2">
                <div className="mb-0.5 flex items-center justify-center gap-1 text-gray-400">
                  <UsersIcon size={11} /> Followers
                </div>
                <div className="font-display font-bold">{creator.followers}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-2">
                <div className="mb-0.5 flex items-center justify-center gap-1 text-gray-400">
                  <ZapIcon size={11} /> {creator.tokenSymbol}
                </div>
                <div className="font-display font-bold">
                  {creator.activeChallenges} active
                </div>
              </div>
            </div>

            <Button href="/creators" variant="ghost" size="sm" className="w-full">
              Follow
            </Button>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}
