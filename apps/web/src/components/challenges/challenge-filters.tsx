import type { ReactNode } from "react";
import type {
  ChallengeFilterState,
  ChallengeStatus,
  RewardType,
  SubmissionFormat,
} from "../../content/challenges";
import { Checkbox } from "../ui/checkbox";

const STATUS_OPTIONS: { value: ChallengeStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "ending-soon", label: "Ending soon" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

const FORMAT_OPTIONS: { value: SubmissionFormat; label: string }[] = [
  { value: "Image", label: "Image" },
  { value: "Video", label: "Video" },
  { value: "Text", label: "Text" },
  { value: "Link", label: "Link" },
];

const REWARD_OPTIONS: { value: RewardType; label: string }[] = [
  { value: "winner", label: "Winner reward" },
  { value: "participation", label: "Participation reward" },
  { value: "both", label: "Both" },
];

export interface ChallengeFiltersProps {
  filters: ChallengeFilterState;
  onToggle<K extends keyof ChallengeFilterState>(
    group: K,
    value: ChallengeFilterState[K][number],
  ): void;
  onClear: () => void;
  activeCount: number;
  heading?: string;
  className?: string;
}

export function ChallengeFilters({
  filters,
  onToggle,
  onClear,
  activeCount,
  heading = "Filters",
  className = "",
}: ChallengeFiltersProps) {
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

      <FilterGroup title="Status">
        {STATUS_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            id={`filter-status-${option.value}`}
            checked={filters.status.includes(option.value)}
            onChange={() => onToggle("status", option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </FilterGroup>

      <FilterGroup title="Submission type">
        {FORMAT_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            id={`filter-format-${option.value}`}
            checked={filters.format.includes(option.value)}
            onChange={() => onToggle("format", option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </FilterGroup>

      <FilterGroup title="Reward type">
        {REWARD_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            id={`filter-reward-${option.value}`}
            checked={filters.rewardType.includes(option.value)}
            onChange={() => onToggle("rewardType", option.value)}
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
  last = false,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <fieldset className={last ? "" : "mb-5 border-b-2 border-black/10 pb-5"}>
      <legend className="mb-2 text-xs font-bold tracking-wide text-black/50 uppercase">
        {title}
      </legend>
      <div className="flex flex-col gap-0.5">{children}</div>
    </fieldset>
  );
}
