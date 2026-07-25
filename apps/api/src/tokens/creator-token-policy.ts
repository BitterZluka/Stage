export interface CreatorTokenDefinition {
  name: string;
  symbol: string;
  decimals: 0;
  totalSupply: string;
  status: "PENDING";
}

export function creatorTokenDefinition(
  handle: string,
  displayName: string,
): CreatorTokenDefinition {
  const configuredInitialSupply =
    process.env.CREATOR_TOKEN_INITIAL_SUPPLY ?? "1000000";
  return {
    name: `${displayName} Credits`,
    symbol: handle
      .replace(/[^a-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10),
    decimals: 0,
    totalSupply: /^[1-9]\d*$/.test(configuredInitialSupply)
      ? configuredInitialSupply
      : "1000000",
    status: "PENDING",
  };
}
