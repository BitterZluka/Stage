import type { ReactNode } from "react";

export type BadgeColor =
  | "cyan"
  | "pink"
  | "lavender"
  | "mint"
  | "yellow"
  | "black"
  | "white"
  | "aqua";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  cyan: "bg-stage-cyan text-black",
  pink: "bg-stage-pink text-black",
  lavender: "bg-stage-lavender text-black",
  mint: "bg-stage-mint text-black",
  yellow: "bg-stage-yellow text-black",
  black: "bg-black text-white",
  white: "bg-white text-black",
  aqua: "bg-stage-aqua text-black",
};

export interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

export function Badge({ children, color = "cyan", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-bold ${COLOR_CLASSES[color]} ${className}`}
    >
      {children}
    </span>
  );
}
