import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export interface CreatorsErrorStateProps {
  onRetry: () => void;
}

export function CreatorsErrorState({ onRetry }: CreatorsErrorStateProps) {
  return (
    <SurfaceCard accent="var(--color-stage-pink)" className="flex flex-col items-center gap-3 p-10 text-center">
      <h3 className="font-display text-xl font-bold">We couldn&apos;t load creators.</h3>
      <p className="max-w-sm text-sm text-gray-600">
        Something went wrong on our end. Please try again in a moment.
      </p>
      <Button type="button" variant="primary" size="md" onClick={onRetry}>
        Try again
      </Button>
    </SurfaceCard>
  );
}
