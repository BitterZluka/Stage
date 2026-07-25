import { CreatorPerks } from "../components/home/creator-perks";
import { FeaturedCreators } from "../components/home/featured-creators";
import { FinalCta } from "../components/home/final-cta";
import { Hero } from "../components/home/hero";
import { HowItWorks } from "../components/home/how-it-works";
import { Leaderboard } from "../components/home/leaderboard";
import { TrendingChallenges } from "../components/home/trending-challenges";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24">
      <Hero />
      <TrendingChallenges />
      <FeaturedCreators />
      <HowItWorks />
      <CreatorPerks />
      <Leaderboard />
      <FinalCta />
    </div>
  );
}
