import type { TokenReward } from "../../content/challenges";
import { ZapIcon } from "../icons";

export interface RewardBadgeProps {
  label: string;
  reward?: TokenReward | undefined;
  tba?: boolean | undefined;
}

export function RewardBadge({ label, reward, tba = false }: RewardBadgeProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-1 font-bold">
        <ZapIcon size={12} />
        {!tba && reward ? `${reward.amount.toLocaleString()} ${reward.token}` : "TBA"}
      </span>
    </div>
  );
}
