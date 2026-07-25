function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/10 ${className}`} aria-hidden="true" />;
}

export function FeaturedCreatorSkeleton() {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border-2 border-black lg:grid-cols-2">
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6">
        <SkeletonBlock className="h-20 w-20 rounded-full" />
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-4 w-24" />
      </div>
      <div className="space-y-3 p-8">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-16 w-full" />
        <div className="flex gap-3">
          <SkeletonBlock className="h-10 w-28" />
          <SkeletonBlock className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

export function CreatorCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-black">
      <SkeletonBlock className="h-20 rounded-none" />
      <div className="space-y-3 p-5">
        <div className="-mt-9 mb-1 flex items-end justify-between">
          <SkeletonBlock className="h-14 w-14 rounded-full" />
          <SkeletonBlock className="h-9 w-20" />
        </div>
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-3 w-1/3" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-9 w-full" />
      </div>
    </div>
  );
}

export function CreatorsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <CreatorCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CreatorFiltersSkeleton() {
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
