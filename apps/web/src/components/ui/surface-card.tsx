import type { ReactNode } from "react";

export interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  /** Hex color used for the offset hard-shadow. Defaults to black. */
  accent?: string;
}

export function SurfaceCard({
  children,
  className = "",
  accent = "#000",
}: SurfaceCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-black bg-white ${className}`}
      style={{ boxShadow: `4px 4px 0 ${accent}` }}
    >
      {children}
    </div>
  );
}
