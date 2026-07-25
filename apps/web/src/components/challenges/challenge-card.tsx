import type { DiscoverChallenge } from "../../content/challenges";
import { ClockIcon, UsersIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";
import { ChallengeStatusBadge } from "./challenge-status-badge";
import { RewardBadge } from "./reward-badge";
import { VerificationBadge } from "./verification-badge";

export interface ChallengeCardProps {
  challenge: DiscoverChallenge;
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  return (
    <SurfaceCard accent={challenge.accent} className="flex h-full flex-col">
      <div
        className="relative flex h-32 items-center justify-center border-b-2 border-black"
        style={{ background: `linear-gradient(135deg, ${challenge.accent}, #ffffff)` }}
      >
        <div className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true" />
        <div className="absolute top-3 left-3">
          <Badge color="white">{challenge.formatNote ?? challenge.format}</Badge>
        </div>
        <div className="absolute top-3 right-3">
          <ChallengeStatusBadge status={challenge.status} />
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-bold text-black/70">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-white text-[9px]"
            aria-hidden="true"
          >
            {challenge.creatorInitials}
          </span>
          {challenge.creatorName}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display mb-1.5 text-base leading-snug font-bold">{challenge.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-gray-600">{challenge.description}</p>

        <VerificationBadge required={challenge.verificationRequired} className="mb-3 self-start" />

        <div className="mt-auto space-y-1.5 border-t-2 border-black/10 pt-3">
          {(challenge.winnerReward ?? challenge.rewardTBA) && (
            <RewardBadge label="Winner reward" reward={challenge.winnerReward} tba={challenge.rewardTBA} />
          )}
          {challenge.participationReward && (
            <RewardBadge label="Participation" reward={challenge.participationReward} />
          )}

          <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <UsersIcon size={12} /> {challenge.submissionCount.toLocaleString()} submissions
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={12} /> {challenge.statusLabel}
            </span>
          </div>
        </div>

        <Button href={`/challenges/${challenge.id}`} variant="ghost" size="sm" className="mt-4 w-full">
          View challenge
        </Button>
      </div>
    </SurfaceCard>
  );
}
