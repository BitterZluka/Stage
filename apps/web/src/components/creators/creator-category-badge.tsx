import type { CreatorCategory } from "../../content/creators";
import { type BadgeColor, Badge } from "../ui/badge";

const CATEGORY_COLOR: Record<CreatorCategory, BadgeColor> = {
  Music: "cyan",
  Art: "pink",
  Video: "lavender",
  Fashion: "mint",
  Gaming: "yellow",
  Lifestyle: "aqua",
  Education: "white",
  Streaming: "black",
};

export interface CreatorCategoryBadgeProps {
  category: CreatorCategory;
  className?: string;
}

export function CreatorCategoryBadge({ category, className = "" }: CreatorCategoryBadgeProps) {
  return (
    <Badge color={CATEGORY_COLOR[category]} className={className}>
      {category}
    </Badge>
  );
}
