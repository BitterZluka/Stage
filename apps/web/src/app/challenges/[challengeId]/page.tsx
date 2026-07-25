import { ChallengeDetailView } from "../../../components/challenges/challenge-detail-view";

export const metadata = { title: "Challenge — STAGE" };

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const { challengeId } = await params;
  return <ChallengeDetailView challengeId={challengeId} />;
}
