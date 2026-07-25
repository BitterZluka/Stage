import type { ChallengeStatus } from "../../content/challenges";
import { type BadgeColor, Badge } from "../ui/badge";

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  open: "Open",
  "ending-soon": "Ending soon",
  upcoming: "Upcoming",
  completed: "Completed",
};

const STATUS_COLOR: Record<ChallengeStatus, BadgeColor> = {
  open: "mint",
  "ending-soon": "pink",
  upcoming: "lavender",
  completed: "black",
};

export interface ChallengeStatusBadgeProps {
  status: ChallengeStatus;
  className?: string;
}

export function ChallengeStatusBadge({ status, className = "" }: ChallengeStatusBadgeProps) {
  return (
    <Badge color={STATUS_COLOR[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
