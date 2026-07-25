"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type ChallengeFilterState,
  type DiscoverChallenge,
  EMPTY_CHALLENGE_FILTERS,
} from "../../content/challenges";
import { catalogService, mapCatalogChallenge } from "../../lib/catalog";
import { CloseIcon, FilterIcon } from "../icons";
import { Button } from "../ui/button";
import { ChallengeCard } from "./challenge-card";
import { ChallengeFilters } from "./challenge-filters";
import { ChallengeSearch } from "./challenge-search";
import { ChallengeSortSelect } from "./challenge-sort-select";
import { ChallengesEmptyState } from "./challenges-empty-state";
import { ChallengesErrorState } from "./challenges-error-state";
import {
  ChallengeFiltersSkeleton,
  ChallengesGridSkeleton,
} from "./challenges-skeleton";
import { ChallengesHero } from "./challenges-hero";
import { matchesChallengeFilters, countActiveFilters } from "./filter";
import { type SortOption, sortChallenges } from "./sort";

const PAGE_SIZE = 6;

export function ChallengesView() {
  const [challenges, setChallenges] = useState<DiscoverChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ChallengeFilterState>(
    EMPTY_CHALLENGE_FILTERS,
  );
  const [sort, setSort] = useState<SortOption>("relevant");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const firstDrawerFieldRef = useRef<HTMLButtonElement>(null);

  const loadChallenges = useCallback(() => {
    setLoading(true);
    setError(false);
    catalogService
      .listChallenges()
      .then(({ items }) => setChallenges(items.map(mapCatalogChallenge)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

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

  const results = useMemo(() => {
    const matched = challenges.filter((item) =>
      matchesChallengeFilters(item, searchQuery, filters),
    );
    return sortChallenges(matched, sort);
  }, [challenges, searchQuery, filters, sort]);

  const visibleResults = results.slice(0, visibleCount);
  const canLoadMore = visibleResults.length < results.length;

  function toggleFilter<K extends keyof ChallengeFilterState>(
    group: K,
    value: ChallengeFilterState[K][number],
  ) {
    setVisibleCount(PAGE_SIZE);
    setFilters((prev) => {
      const current = prev[group];
      const exists = (current as ChallengeFilterState[K][number][]).includes(
        value,
      );
      const next = exists
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [group]: next };
    });
  }

  function clearAll() {
    setSearchQuery("");
    setFilters(EMPTY_CHALLENGE_FILTERS);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSortChange(value: SortOption) {
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

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24">
      <ChallengesHero />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ChallengeSearch
          value={searchQuery}
          onChange={handleSearchChange}
          className="sm:max-w-sm"
        />

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

          <ChallengeSortSelect
            value={sort}
            onChange={handleSortChange}
            className="min-w-[170px]"
          />

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
              <ChallengeFiltersSkeleton />
            ) : (
              <ChallengeFilters
                filters={filters}
                onToggle={toggleFilter}
                onClear={clearAll}
                activeCount={activeFilterCount}
              />
            )}
          </div>
        </aside>

        <div>
          {error && !loading && (
            <ChallengesErrorState onRetry={loadChallenges} />
          )}

          {!error && loading && (
            <div className="space-y-8">
              <ChallengesGridSkeleton />
            </div>
          )}

          {!error && !loading && (
            <section aria-labelledby="challenge-results-heading">
              <h2
                id="challenge-results-heading"
                className="font-display mb-6 text-2xl font-bold sm:text-3xl"
              >
                {hasActiveFilters
                  ? `${results.length} challenges found`
                  : "All challenges"}
              </h2>

              {visibleResults.length === 0 ? (
                <ChallengesEmptyState
                  onClear={clearAll}
                  showClear={hasActiveFilters}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleResults.map((challenge) => (
                      <ChallengeCard key={challenge.id} challenge={challenge} />
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
                        {loadingMore ? "Loading…" : "Load more challenges"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
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
            aria-label="Filter challenges"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-2 border-black bg-white p-5 pb-8 shadow-offset"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">
                Filter challenges
              </span>
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

            <ChallengeFilters
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
