import { LEADERBOARD } from "../../content/homepage";
import { ZapIcon } from "../icons";
import { SurfaceCard } from "../ui/surface-card";

const RANK_BADGE_BG: Record<number, string> = {
  1: "var(--color-stage-yellow)",
  2: "#e0e0e0",
  3: "#ffb347",
};

export function Leaderboard() {
  return (
    <section aria-labelledby="leaderboard-heading" className="mt-16 sm:mt-20">
      <h2 id="leaderboard-heading" className="font-display mb-6 text-2xl font-bold sm:text-3xl">
        Community Leaderboard
      </h2>

      <SurfaceCard>
        <ol className="divide-y-2 divide-black/10">
          {LEADERBOARD.map((entry) => (
            <li key={entry.rank} className="flex items-center gap-4 px-5 py-4 sm:px-6">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black text-sm font-bold"
                style={{ background: RANK_BADGE_BG[entry.rank] ?? "#fff" }}
                aria-hidden="true"
              >
                {entry.rank}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display truncate text-sm font-bold">{entry.user}</div>
                <div className="text-xs text-gray-400">
                  {entry.submissions} submissions · {entry.wins} wins
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1 text-sm font-bold">
                  <ZapIcon size={12} /> {entry.points.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">credits</div>
              </div>
            </li>
          ))}
        </ol>
      </SurfaceCard>
    </section>
  );
}
