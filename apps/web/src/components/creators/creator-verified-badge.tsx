import { VerifiedIcon } from "../icons";
import { Badge } from "../ui/badge";

export interface CreatorVerifiedBadgeProps {
  className?: string;
}

export function CreatorVerifiedBadge({
  className = "",
}: CreatorVerifiedBadgeProps) {
  return (
    <Badge color="cyan" className={className}>
      <VerifiedIcon size={11} /> Verified
    </Badge>
  );
}
