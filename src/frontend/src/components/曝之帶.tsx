import type { Edge } from "../types";

/**
 * 曝之帶:一路之日曝,並其信之疏密,合為一橫帶。
 *
 * This is the design signature. A route line on a map projects false certainty —
 * one clean stroke, no indication of which parts the data actually vouches for.
 * The strip shows both at once: colour is sun exposure, hatching is inferred
 * data. Where it looks textured, the tool is telling you it does not know.
 */
export function 曝之帶({
  edges,
  hourIdx,
  className = "",
}: {
  edges: Edge[];
  hourIdx: number;
  className?: string;
}) {
  const 總 = edges.reduce((s, e) => s + e.length_m, 0);
  if (總 === 0) return null;

  const 色 = (曝: number) =>
    曝 < 0.34 ? "var(--color-shade)"
      : 曝 < 0.67 ? "var(--color-midsun)"
        : "var(--color-fullsun)";

  return (
    <div className={className}>
      <div
        className="flex h-6 w-full overflow-hidden rounded border border-line"
        role="img"
        aria-label={
          `Sun exposure along the route. ` +
          `${Math.round(
            (edges.filter((e) => (e.sun_exposure?.[hourIdx] ?? 1) < 0.34)
              .reduce((s, e) => s + e.length_m, 0) / 總) * 100,
          )}% shaded, ` +
          `${edges.filter((e) => e.confidence !== "high").length} of ${edges.length} ` +
          `segments have unverified accessibility data.`
        }
      >
        {edges.map((e, i) => {
          const 曝 = e.sun_exposure?.[hourIdx] ?? 1;
          return (
            <div
              key={`${e.id}-${i}`}
              className={
                e.confidence === "low" ? "纹-low"
                  : e.confidence === "medium" ? "纹-medium"
                    : ""
              }
              style={{
                width: `${(e.length_m / 總) * 100}%`,
                backgroundColor: 色(曝),
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-shade" aria-hidden />
          shade
        </span>
        <span className="flex items-center gap-1">
          <span className="纹-low inline-block h-2 w-4 rounded-sm border border-line" aria-hidden />
          hatched = inferred data
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-fullsun" aria-hidden />
          full sun
        </span>
      </div>
    </div>
  );
}
