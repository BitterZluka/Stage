import type { DiscoverChallenge } from "../../content/challenges";

export type SortOption = "relevant" | "ending-soon" | "newest" | "highest-reward" | "most-submissions";

function rewardValue(challenge: DiscoverChallenge): number {
  return Math.max(challenge.winnerReward?.amount ?? 0, challenge.participationReward?.amount ?? 0);
}

export function sortChallenges(challenges: DiscoverChallenge[], sort: SortOption): DiscoverChallenge[] {
  if (sort === "relevant") return challenges;

  const sorted = [...challenges];
  switch (sort) {
    case "ending-soon":
      return sorted.sort((a, b) => (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity));
    case "newest":
      return sorted.sort((a, b) => a.recencyRank - b.recencyRank);
    case "highest-reward":
      return sorted.sort((a, b) => rewardValue(b) - rewardValue(a));
    case "most-submissions":
      return sorted.sort((a, b) => b.submissionCount - a.submissionCount);
    default:
      return sorted;
  }
}
