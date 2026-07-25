import type { ChallengeFilterState, DiscoverChallenge, VerificationFilter } from "../../content/challenges";

export function matchesChallengeFilters(
  challenge: DiscoverChallenge,
  search: string,
  filters: ChallengeFilterState,
): boolean {
  const query = search.trim().toLowerCase();
  if (query) {
    const haystack = `${challenge.title} ${challenge.description} ${challenge.creatorName}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (filters.status.length > 0 && !filters.status.includes(challenge.status)) return false;
  if (filters.format.length > 0 && !filters.format.includes(challenge.format)) return false;
  if (filters.rewardType.length > 0 && !filters.rewardType.includes(challenge.rewardType)) return false;

  if (filters.verification.length > 0) {
    const bucket: VerificationFilter = challenge.verificationRequired ? "required" : "not-required";
    if (!filters.verification.includes(bucket)) return false;
  }

  return true;
}

export function countActiveFilters(filters: ChallengeFilterState): number {
  return (
    filters.status.length + filters.format.length + filters.rewardType.length + filters.verification.length
  );
}
