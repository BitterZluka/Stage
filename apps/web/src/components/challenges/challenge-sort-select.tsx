import type { ChangeEvent } from "react";
import type { SortOption } from "./sort";
import { ChevronDownIcon } from "../icons";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevant", label: "Most relevant" },
  { value: "ending-soon", label: "Ending soon" },
  { value: "newest", label: "Newest" },
  { value: "highest-reward", label: "Highest reward" },
  { value: "most-submissions", label: "Most submissions" },
];

export interface ChallengeSortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

export function ChallengeSortSelect({
  value,
  onChange,
  className = "",
}: ChallengeSortSelectProps) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor="challenge-sort" className="sr-only">
        Sort challenges
      </label>
      <select
        id="challenge-sort"
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value as SortOption)
        }
        className="w-full appearance-none rounded-xl border-2 border-black bg-white py-3 pr-9 pl-4 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        size={14}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-black/60"
      />
    </div>
  );
}
