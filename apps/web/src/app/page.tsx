import { Hero } from "../components/home/hero";
import { HowItWorks } from "../components/home/how-it-works";
import { Leaderboard } from "../components/home/leaderboard";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24">
      <Hero />
      <HowItWorks />
      <Leaderboard />
    </div>
  );
}
