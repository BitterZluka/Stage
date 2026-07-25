import type { ChangeEvent } from "react";
import type { CreatorSortOption } from "./sort";
import { ChevronDownIcon } from "../icons";

const SORT_OPTIONS: { value: CreatorSortOption; label: string }[] = [
  { value: "relevant", label: "Most relevant" },
  { value: "trending", label: "Trending" },
  { value: "most-followers", label: "Most followers" },
  { value: "most-active-challenges", label: "Most active challenges" },
  { value: "newest", label: "Newest creators" },
];

export interface CreatorSortSelectProps {
  value: CreatorSortOption;
  onChange: (value: CreatorSortOption) => void;
  className?: string;
}

export function CreatorSortSelect({
  value,
  onChange,
  className = "",
}: CreatorSortSelectProps) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor="creator-sort" className="sr-only">
        Sort creators
      </label>
      <select
        id="creator-sort"
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value as CreatorSortOption)
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
