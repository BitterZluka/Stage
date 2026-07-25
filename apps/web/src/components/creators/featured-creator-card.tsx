import type { DiscoverCreator } from "../../content/creators";
import { FlameIcon, GiftIcon, UsersIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";
import { CreatorCategoryBadge } from "./creator-category-badge";
import { FollowButton } from "./follow-button";
import { formatFollowerCount } from "./format";

export interface FeaturedCreatorCardProps {
  creator: DiscoverCreator;
  following: boolean;
  onToggleFollow: (creatorId: string) => void;
  className?: string;
}

export function FeaturedCreatorCard({
  creator,
  following,
  onToggleFollow,
  className = "",
}: FeaturedCreatorCardProps) {
  return (
    <SurfaceCard
      accent={creator.accent}
      className={`grid grid-cols-1 lg:grid-cols-2 ${className}`}
    >
      <div
        className="relative flex min-h-[240px] flex-col items-center justify-center gap-3 border-b-2 border-black p-6 text-center lg:border-r-2 lg:border-b-0"
        style={{
          background: `linear-gradient(135deg, ${creator.accent}, #ffffff)`,
        }}
      >
        <div
          className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
        />
        <div
          className="bg-scanlines pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
        />
        <div className="absolute top-4 left-4">
          <Badge color="yellow">Featured</Badge>
        </div>

        <span
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-white text-2xl font-bold shadow-offset"
          aria-hidden="true"
        >
          {creator.avatarInitials}
        </span>
        <div className="relative z-10">
          <p className="font-display text-xl font-bold">
            {creator.displayName}
          </p>
          <p className="text-sm font-bold text-black/60">{creator.username}</p>
        </div>
        <div className="relative z-10">
          <CreatorCategoryBadge category={creator.category} />
        </div>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="mb-4 text-sm leading-relaxed text-gray-600 sm:text-base">
          {creator.bio}
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <UsersIcon size={14} />{" "}
            {formatFollowerCount(creator.followersCount)} followers
          </span>
          <span className="flex items-center gap-1.5">
            <FlameIcon size={14} /> {creator.activeChallengesCount} active
            challenges
          </span>
          <span className="flex items-center gap-1.5">
            <GiftIcon size={14} /> {creator.perksCount} perks
          </span>
        </div>

        <div className="mb-5 flex items-center justify-between border-t-2 border-black/10 pt-4 text-sm">
          <span className="text-gray-500">Creator token</span>
          <span className="font-bold">
            {creator.tokenName} ({creator.tokenSymbol})
          </span>
        </div>

        {creator.highlight && (
          <div className="mb-6 rounded-xl border-2 border-black bg-black/[0.03] p-4">
            <p className="mb-1 text-xs font-bold tracking-wide text-black/50 uppercase">
              {creator.highlight.kind === "challenge"
                ? "Active challenge"
                : "Featured perk"}
            </p>
            <p className="font-display text-sm font-bold">
              {creator.highlight.title}
            </p>
            <p className="text-xs text-gray-500">{creator.highlight.detail}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <FollowButton
            displayName={creator.displayName}
            following={following}
            onToggle={() => onToggleFollow(creator.id)}
            size="md"
          />
          <Button
            href={`/creators/${creator.slug}`}
            variant="primary"
            size="md"
          >
            View profile
          </Button>
        </div>
      </div>
    </SurfaceCard>
  );
}
