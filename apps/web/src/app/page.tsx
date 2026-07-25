import { MockChallengeService } from "@creator-platform/api-client";

const challengeService = new MockChallengeService();

export default async function HomePage() {
  const challenges = await challengeService.listChallenges();

  return (
    <main>
      <p>Stage 0 foundation</p>
      <h1>Creator Platform</h1>
      <p>
        {challenges.items.length} mock challenges are ready for UI integration.
      </p>
    </main>
  );
}
