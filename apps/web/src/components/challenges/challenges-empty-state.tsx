import Image from "next/image";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export interface ChallengesEmptyStateProps {
  onClear: () => void;
  showClear: boolean;
}

export function ChallengesEmptyState({ onClear, showClear }: ChallengesEmptyStateProps) {
  return (
    <SurfaceCard accent="var(--color-stage-lavender)" className="flex flex-col items-center gap-4 p-10 text-center">
      <Image
        src="/brand/IMG_1538.PNG"
        alt=""
        aria-hidden="true"
        width={220}
        height={152}
        className="h-auto w-28"
      />
      <h3 className="font-display text-xl font-bold">No challenges match these filters.</h3>
      <p className="max-w-sm text-sm text-gray-600">
        Try a different search term or loosen your filters to see more creator challenges.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {showClear && (
          <Button type="button" variant="primary" size="md" onClick={onClear}>
            Clear filters
          </Button>
        )}
        <Button href="/creators" variant="ghost" size="md">
          Explore creators
        </Button>
      </div>
    </SurfaceCard>
  );
}
