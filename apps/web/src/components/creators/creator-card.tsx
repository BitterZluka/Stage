import type { DiscoverCreator } from "../../content/creators";
import { FlameIcon, GiftIcon, UsersIcon } from "../icons";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";
import { CreatorCategoryBadge } from "./creator-category-badge";
import { FollowButton } from "./follow-button";
import { formatFollowerCount } from "./format";

export interface CreatorCardProps {
  creator: DiscoverCreator;
  following: boolean;
  onToggleFollow: (creatorId: string) => void;
}

export function CreatorCard({
  creator,
  following,
  onToggleFollow,
}: CreatorCardProps) {
  return (
    <SurfaceCard accent={creator.accent} className="flex h-full flex-col">
      <div
        className="relative flex h-20 items-center justify-center border-b-2 border-black"
        style={{
          background: `linear-gradient(135deg, ${creator.accent}, #ffffff)`,
        }}
      >
        <div
          className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
        />
        <div className="absolute top-3 left-3">
          <CreatorCategoryBadge category={creator.category} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 -mt-4 flex items-end justify-between gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white text-sm font-bold shadow-offset"
            aria-hidden="true"
          >
            {creator.avatarInitials}
          </span>
          <FollowButton
            displayName={creator.displayName}
            following={following}
            onToggle={() => onToggleFollow(creator.id)}
          />
        </div>

        <h3 className="font-display text-base leading-snug font-bold">
          {creator.displayName}
        </h3>
        <p className="mb-2.5 text-sm text-gray-500">{creator.username}</p>
        <p className="mb-3 line-clamp-2 text-sm text-gray-600">{creator.bio}</p>

        <div className="mt-auto space-y-2 border-t-2 border-black/10 pt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <UsersIcon size={12} />{" "}
              {formatFollowerCount(creator.followersCount)} followers
            </span>
            <span className="font-bold text-black">{creator.tokenSymbol}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FlameIcon size={12} /> {creator.activeChallengesCount} active
              challenges
            </span>
            <span className="flex items-center gap-1">
              <GiftIcon size={12} /> {creator.perksCount} perks
            </span>
          </div>
        </div>

        <Button
          href={`/creators/${creator.slug}`}
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
        >
          View creator
        </Button>
      </div>
    </SurfaceCard>
  );
}
