"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CreatorFilterState,
  type DiscoverCreator,
  EMPTY_CREATOR_FILTERS,
  getDiscoverCreators,
} from "../../content/creators";
import { CloseIcon, FilterIcon } from "../icons";
import { Button } from "../ui/button";
import { CreatorCard } from "./creator-card";
import { CreatorCategoryStrip } from "./creator-category-strip";
import { type ArrayFilterKey, CreatorFilters } from "./creator-filters";
import { CreatorSearch } from "./creator-search";
import { CreatorSortSelect } from "./creator-sort-select";
import { CreatorsEmptyState } from "./creators-empty-state";
import { CreatorsErrorState } from "./creators-error-state";
import {
  CreatorFiltersSkeleton,
  CreatorsGridSkeleton,
  FeaturedCreatorSkeleton,
} from "./creators-skeleton";
import { CreatorsHero } from "./creators-hero";
import { FeaturedCreatorCard } from "./featured-creator-card";
import { countActiveFilters, matchesCreatorFilters } from "./filter";
import { type CreatorSortOption, sortCreators } from "./sort";

const PAGE_SIZE = 6;

export function CreatorsView() {
  const [creators, setCreators] = useState<DiscoverCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<CreatorFilterState>(EMPTY_CREATOR_FILTERS);
  const [sort, setSort] = useState<CreatorSortOption>("relevant");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [followedIds, setFollowedIds] = useState<ReadonlySet<string>>(() => new Set());

  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const firstDrawerFieldRef = useRef<HTMLButtonElement>(null);

  const loadCreators = useCallback(() => {
    setLoading(true);
    setError(false);
    getDiscoverCreators()
      .then((items) => setCreators(items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCreators();
  }, [loadCreators]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    firstDrawerFieldRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileFiltersOpen(false);
        filtersButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileFiltersOpen]);

  const activeFilterCount = countActiveFilters(filters);
  const hasActiveQuery = searchQuery.trim().length > 0;
  const hasActiveFilters = hasActiveQuery || activeFilterCount > 0;

  const featured = useMemo(
    () => (hasActiveFilters ? undefined : creators.find((item) => item.featured)),
    [creators, hasActiveFilters],
  );

  const results = useMemo(() => {
    const matched = creators.filter((item) => matchesCreatorFilters(item, searchQuery, filters));
    const withoutFeatured = featured ? matched.filter((item) => item.id !== featured.id) : matched;
    return sortCreators(withoutFeatured, sort);
  }, [creators, searchQuery, filters, featured, sort]);

  const visibleResults = results.slice(0, visibleCount);
  const canLoadMore = visibleResults.length < results.length;

  function toggleFilter<K extends ArrayFilterKey>(group: K, value: CreatorFilterState[K][number]) {
    setVisibleCount(PAGE_SIZE);
    setFilters((prev) => {
      const current = prev[group];
      const exists = (current as CreatorFilterState[K][number][]).includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [group]: next };
    });
  }

  function clearAll() {
    setSearchQuery("");
    setFilters(EMPTY_CREATOR_FILTERS);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSortChange(value: CreatorSortOption) {
    setSort(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((count) => count + PAGE_SIZE);
      setLoadingMore(false);
    }, 400);
  }

  function toggleFollow(creatorId: string) {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24">
      <CreatorsHero />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <CreatorSearch value={searchQuery} onChange={handleSearchChange} className="sm:max-w-sm" />

        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            ref={filtersButtonRef}
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            aria-haspopup="dialog"
            className="flex items-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-bold hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:hidden"
          >
            <FilterIcon size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <CreatorSortSelect value={sort} onChange={handleSortChange} className="min-w-[190px]" />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="hidden rounded px-2 py-1 text-sm font-bold text-black/60 underline decoration-2 underline-offset-2 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:inline-block"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border-2 border-black bg-white p-5 shadow-offset">
            {loading ? (
              <CreatorFiltersSkeleton />
            ) : (
              <CreatorFilters
                filters={filters}
                onToggle={toggleFilter}
                onClear={clearAll}
                activeCount={activeFilterCount}
              />
            )}
          </div>
        </aside>

        <div>
          {error && !loading && <CreatorsErrorState onRetry={loadCreators} />}

          {!error && loading && (
            <div className="space-y-8">
              <FeaturedCreatorSkeleton />
              <CreatorsGridSkeleton />
            </div>
          )}

          {!error && !loading && (
            <>
              {featured && (
                <section aria-labelledby="featured-creator-heading" className="mb-10">
                  <h2 id="featured-creator-heading" className="sr-only">
                    Featured creator
                  </h2>
                  <FeaturedCreatorCard
                    creator={featured}
                    following={followedIds.has(featured.id)}
                    onToggleFollow={toggleFollow}
                  />
                </section>
              )}

              <section aria-labelledby="creator-results-heading">
                <h2 id="creator-results-heading" className="font-display mb-6 text-2xl font-bold sm:text-3xl">
                  {hasActiveFilters ? `${results.length} creators found` : "All creators"}
                </h2>

                {visibleResults.length === 0 ? (
                  <CreatorsEmptyState onClear={clearAll} showClear={hasActiveFilters} />
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleResults.map((creator) => (
                        <CreatorCard
                          key={creator.id}
                          creator={creator}
                          following={followedIds.has(creator.id)}
                          onToggleFollow={toggleFollow}
                        />
                      ))}
                    </div>

                    {canLoadMore && (
                      <div className="mt-10 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                        >
                          {loadingMore ? "Loading…" : "Load more creators"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section aria-labelledby="creator-categories-heading" className="mt-12">
                <h2 id="creator-categories-heading" className="font-display mb-4 text-lg font-bold">
                  Browse by category
                </h2>
                <CreatorCategoryStrip
                  selected={filters.category}
                  onToggle={(category) => toggleFilter("category", category)}
                />
              </section>
            </>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter creators"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-2 border-black bg-white p-5 pb-8 shadow-offset"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Filter creators</span>
              <button
                ref={firstDrawerFieldRef}
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <CreatorFilters
              filters={filters}
              onToggle={toggleFilter}
              onClear={clearAll}
              activeCount={activeFilterCount}
              heading="Filters"
            />

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="mt-6 w-full"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show {results.length} results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
