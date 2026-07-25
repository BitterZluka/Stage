import type { DiscoverCreator } from "../../content/creators";

export type CreatorSortOption = "relevant" | "trending" | "most-followers" | "most-active-challenges" | "newest";

export function sortCreators(creators: DiscoverCreator[], sort: CreatorSortOption): DiscoverCreator[] {
  if (sort === "relevant") return creators;

  const sorted = [...creators];
  switch (sort) {
    case "trending":
      return sorted.sort((a, b) => Number(b.trending) - Number(a.trending) || b.followersCount - a.followersCount);
    case "most-followers":
      return sorted.sort((a, b) => b.followersCount - a.followersCount);
    case "most-active-challenges":
      return sorted.sort((a, b) => b.activeChallengesCount - a.activeChallengesCount);
    case "newest":
      return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    default:
      return sorted;
  }
}
