import type { MouseEvent } from "react";
import { CheckIcon } from "../icons";

export interface FollowButtonProps {
  displayName: string;
  following: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "px-3.5 py-2 text-xs gap-1",
  md: "px-5 py-2.5 text-sm gap-1.5",
};

export function FollowButton({
  displayName,
  following,
  onToggle,
  size = "sm",
  className = "",
}: FollowButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={
        following
          ? `Following ${displayName}. Click to unfollow.`
          : `Follow ${displayName}`
      }
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
        onToggle();
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-black font-bold shadow-offset transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
        following
          ? "bg-black text-white"
          : "bg-white text-black hover:bg-black/5"
      } ${SIZE_CLASSES[size]} ${className}`}
    >
      {following && <CheckIcon size={13} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
