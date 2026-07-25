import { Button } from "./ui/button";
import { SurfaceCard } from "./ui/surface-card";

export interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <SurfaceCard accent="var(--color-stage-cyan)" className="p-10">
        <h1 className="font-display mb-3 text-3xl font-bold">{title}</h1>
        <p className="mb-8 text-gray-600">{description}</p>
        <Button href="/" variant="primary" size="md">
          Back to homepage
        </Button>
      </SurfaceCard>
    </div>
  );
}
