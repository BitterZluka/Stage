import { TRENDING_CHALLENGES } from "../../content/homepage";
import { ClockIcon, UsersIcon, VerifiedIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function TrendingChallenges() {
  return (
    <section aria-labelledby="trending-challenges-heading" className="mt-16 sm:mt-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="trending-challenges-heading" className="font-display text-2xl font-bold sm:text-3xl">
          Trending Challenges
        </h2>
        <Button href="/challenges" variant="ghost" size="sm">
          View all challenges
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TRENDING_CHALLENGES.map((challenge) => (
          <SurfaceCard key={challenge.id} accent={challenge.accent}>
            <div
              className="relative flex h-32 items-center justify-center border-b-2 border-black"
              style={{
                background: `linear-gradient(135deg, ${challenge.accent}, #ffffff)`,
              }}
            >
              <div className="absolute top-3 left-3">
                <Badge color="white">{challenge.format}</Badge>
              </div>
              {challenge.verified && (
                <div className="absolute top-3 right-3">
                  <Badge color="cyan">
                    <VerifiedIcon size={11} /> Verified
                  </Badge>
                </div>
              )}
              <div className="absolute bottom-3 left-3 text-xs font-bold text-black/70">
                {challenge.creatorInitials} · {challenge.creatorName}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <h3 className="font-display mb-3 text-base leading-snug font-bold">
                {challenge.title}
              </h3>

              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 font-bold">
                  <ZapIcon size={13} className="text-black" />
                  {challenge.winnerReward} credits to win
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <ClockIcon size={12} /> {challenge.deadlineLabel}
                </span>
              </div>

              {challenge.participationReward !== undefined && (
                <p className="mb-2 text-xs text-gray-500">
                  +{challenge.participationReward} credits just for entering
                </p>
              )}

              <div className="mb-4 flex items-center gap-1 text-xs text-gray-400">
                <UsersIcon size={12} /> {challenge.submissionCount.toLocaleString()} submissions
              </div>

              <Button href="/challenges" variant="ghost" size="sm" className="w-full">
                View Challenge
              </Button>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}
