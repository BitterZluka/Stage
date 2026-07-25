import { CreatorProfileView } from "../../../components/creators/creator-profile-view";

export const metadata = { title: "Creator profile — STAGE" };

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ creatorSlug: string }>;
}) {
  const { creatorSlug } = await params;
  return <CreatorProfileView creatorSlug={creatorSlug} />;
}
