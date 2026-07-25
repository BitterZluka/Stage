import { communitySizeOf, type CreatorFilterState, type DiscoverCreator } from "../../content/creators";

export function matchesCreatorFilters(
  creator: DiscoverCreator,
  search: string,
  filters: CreatorFilterState,
): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = `${creator.displayName} ${creator.username} ${creator.category} ${creator.bio} ${creator.tokenSymbol}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (filters.category.length > 0 && !filters.category.includes(creator.category)) return false;

  if (filters.activity.length > 0) {
    const matchesActivity = filters.activity.some((activity) => {
      if (activity === "active-challenges") return creator.activeChallengesCount > 0;
      if (activity === "perks-available") return creator.perksCount > 0;
      return Boolean(creator.recentlyActive);
    });
    if (!matchesActivity) return false;
  }

  if (filters.communitySize.length > 0 && !filters.communitySize.includes(communitySizeOf(creator))) {
    return false;
  }

  return true;
}

export function countActiveFilters(filters: CreatorFilterState): number {
  return filters.category.length + filters.activity.length + filters.communitySize.length;
}
