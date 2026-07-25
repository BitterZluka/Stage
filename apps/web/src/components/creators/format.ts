/** Compact follower-count formatting, e.g. 24800 -> "24.8K". */
export function formatFollowerCount(count: number): string {
  if (count < 1000) return String(count);
  const thousands = Math.round((count / 1000) * 10) / 10;
  return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
}
