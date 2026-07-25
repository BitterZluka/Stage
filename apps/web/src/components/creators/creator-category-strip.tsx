import type { CreatorCategory } from "../../content/creators";

const STRIP_CATEGORIES: { value: CreatorCategory; label: string }[] = [
  { value: "Music", label: "Music" },
  { value: "Art", label: "Visual Art" },
  { value: "Video", label: "Video" },
  { value: "Fashion", label: "Fashion" },
  { value: "Gaming", label: "Gaming" },
  { value: "Streaming", label: "Streaming" },
];

export interface CreatorCategoryStripProps {
  selected: CreatorCategory[];
  onToggle: (category: CreatorCategory) => void;
  className?: string;
}

export function CreatorCategoryStrip({
  selected,
  onToggle,
  className = "",
}: CreatorCategoryStripProps) {
  return (
    <div
      role="group"
      aria-label="Filter by category"
      className={`-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 ${className}`}
    >
      {STRIP_CATEGORIES.map((category) => {
        const active = selected.includes(category.value);
        return (
          <button
            key={category.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(category.value)}
            className={`shrink-0 rounded-full border-2 border-black px-4 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
              active
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-black/5"
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
