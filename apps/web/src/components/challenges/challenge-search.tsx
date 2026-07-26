import type { ChangeEvent } from "react";
import { SearchIcon } from "../icons";

export interface ChallengeSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ChallengeSearch({
  value,
  onChange,
  className = "",
}: ChallengeSearchProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <label htmlFor="challenge-search" className="sr-only">
        Search challenges
      </label>
      <SearchIcon
        size={18}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-black/50"
      />
      <input
        id="challenge-search"
        type="search"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        placeholder="Search challenges, creators..."
        className="w-full rounded-xl border-2 border-black py-4 pr-5 pl-12 text-base placeholder:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      />
    </div>
  );
}
