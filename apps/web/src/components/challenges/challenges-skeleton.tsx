function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/10 ${className}`} aria-hidden="true" />;
}

export function ChallengeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-black">
      <SkeletonBlock className="h-32 rounded-none" />
      <div className="space-y-3 p-5">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-9 w-full" />
      </div>
    </div>
  );
}

export function ChallengesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <ChallengeCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ChallengeFiltersSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
