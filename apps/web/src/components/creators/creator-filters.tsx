import type { ReactNode } from "react";
import type {
  ActivityFilter,
  CommunitySize,
  CreatorCategory,
  CreatorFilterState,
} from "../../content/creators";
import { Checkbox } from "../ui/checkbox";

const CATEGORY_OPTIONS: { value: CreatorCategory; label: string }[] = [
  { value: "Music", label: "Music" },
  { value: "Art", label: "Art" },
  { value: "Video", label: "Video" },
  { value: "Fashion", label: "Fashion" },
  { value: "Gaming", label: "Gaming" },
  { value: "Lifestyle", label: "Lifestyle" },
  { value: "Education", label: "Education" },
  { value: "Streaming", label: "Streaming" },
];

const ACTIVITY_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: "active-challenges", label: "Active challenges" },
  { value: "perks-available", label: "Perks available" },
  { value: "recently-active", label: "Recently active" },
];

const COMMUNITY_SIZE_OPTIONS: { value: CommunitySize; label: string }[] = [
  { value: "emerging", label: "Emerging" },
  { value: "growing", label: "Growing" },
  { value: "established", label: "Established" },
];

export type ArrayFilterKey = "category" | "activity" | "communitySize";

export interface CreatorFiltersProps {
  filters: CreatorFilterState;
  onToggle<K extends ArrayFilterKey>(
    group: K,
    value: CreatorFilterState[K][number],
  ): void;
  onClear: () => void;
  activeCount: number;
  heading?: string;
  className?: string;
}

export function CreatorFilters({
  filters,
  onToggle,
  onClear,
  activeCount,
  heading = "Filters",
  className = "",
}: CreatorFiltersProps) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{heading}</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-1 text-xs font-bold text-black/60 underline decoration-2 underline-offset-2 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Category">
        {CATEGORY_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            id={`filter-category-${option.value}`}
            checked={filters.category.includes(option.value)}
            onChange={() => onToggle("category", option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </FilterGroup>

      <FilterGroup title="Activity">
        {ACTIVITY_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            id={`filter-activity-${option.value}`}
            checked={filters.activity.includes(option.value)}
            onChange={() => onToggle("activity", option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </FilterGroup>

      <FilterGroup title="Community size">
        {COMMUNITY_SIZE_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            id={`filter-community-size-${option.value}`}
            checked={filters.communitySize.includes(option.value)}
            onChange={() => onToggle("communitySize", option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="mb-5 border-b-2 border-black/10 pb-5">
      <legend className="mb-2 text-xs font-bold tracking-wide text-black/50 uppercase">
        {title}
      </legend>
      <div className="flex flex-col gap-0.5">{children}</div>
    </fieldset>
  );
}
