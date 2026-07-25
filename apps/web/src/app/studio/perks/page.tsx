import { Badge } from "../../../components/ui/badge";
import { SurfaceCard } from "../../../components/ui/surface-card";

export const metadata = { title: "Manage perks — STAGE" };

export default function StudioPerksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SurfaceCard accent="var(--color-stage-lavender)" className="p-8 sm:p-12">
        <Badge color="lavender">Next studio module</Badge>
        <h2 className="font-display mt-5 text-3xl font-bold sm:text-4xl">
          Creator perks will live here
        </h2>
        <p className="mt-3 max-w-2xl text-gray-600">
          This creator-only page is reserved for perk creation and management.
          The navigation and access protection are ready, but perk controls are
          intentionally not implemented in this change.
        </p>
      </SurfaceCard>
    </div>
  );
}
