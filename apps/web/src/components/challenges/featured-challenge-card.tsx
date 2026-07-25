import type { DiscoverChallenge } from "../../content/challenges";
import { ClockIcon, UsersIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";
import { ChallengeStatusBadge } from "./challenge-status-badge";
import { RewardBadge } from "./reward-badge";
import { VerificationBadge } from "./verification-badge";

export interface FeaturedChallengeCardProps {
  challenge: DiscoverChallenge;
  className?: string;
}

export function FeaturedChallengeCard({ challenge, className = "" }: FeaturedChallengeCardProps) {
  return (
    <SurfaceCard accent={challenge.accent} className={`grid grid-cols-1 lg:grid-cols-2 ${className}`}>
      <div
        className="relative flex min-h-[220px] items-center justify-center border-b-2 border-black lg:border-r-2 lg:border-b-0"
        style={{ background: `linear-gradient(135deg, ${challenge.accent}, #ffffff)` }}
      >
        <div className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />
        <div className="bg-scanlines pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden="true" />
        <div className="absolute top-4 left-4">
          <Badge color="yellow">Featured</Badge>
        </div>
        <div className="absolute top-4 right-4">
          <ChallengeStatusBadge status={challenge.status} />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-xs font-bold"
            aria-hidden="true"
          >
            {challenge.creatorInitials}
          </span>
          <span className="text-sm font-bold text-black/80">{challenge.creatorName}</span>
        </div>
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8">
        <Badge color="white" className="mb-3 self-start">
          {challenge.formatNote ?? challenge.format}
        </Badge>
        <h3 className="font-display mb-2 text-2xl leading-tight font-bold sm:text-3xl">{challenge.title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-gray-600 sm:text-base">{challenge.description}</p>

        <VerificationBadge required={challenge.verificationRequired} className="mb-4 self-start" />

        <div className="mb-5 space-y-2 border-t-2 border-black/10 pt-4">
          {(challenge.winnerReward ?? challenge.rewardTBA) && (
            <RewardBadge label="Winner reward" reward={challenge.winnerReward} tba={challenge.rewardTBA} />
          )}
          {challenge.participationReward && (
            <RewardBadge label="Participation reward" reward={challenge.participationReward} />
          )}
        </div>

        <div className="mb-6 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <UsersIcon size={12} /> {challenge.submissionCount.toLocaleString()} submissions
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon size={12} /> {challenge.statusLabel}
          </span>
        </div>

        <Button href={`/challenges/${challenge.id}`} variant="primary" size="md" className="self-start">
          View challenge
        </Button>
      </div>
    </SurfaceCard>
  );
}
