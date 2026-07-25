import { VerifiedIcon } from "../icons";
import { Badge } from "../ui/badge";

export interface VerificationBadgeProps {
  required: boolean;
  className?: string;
}

export function VerificationBadge({ required, className = "" }: VerificationBadgeProps) {
  if (!required) return null;
  return (
    <Badge color="cyan" className={className}>
      <VerifiedIcon size={11} /> Verification required
    </Badge>
  );
}
