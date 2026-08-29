import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "motion";
import type { Edge } from "../types";
import { 曝之色 } from "../routing/曝之色";
import { 曲微, 時微, 安動 } from "../motion/预设";

/**
 * ExposureStrip:一路之日曝,並其信之疏密,合為一橫帶。
 *
 * This is the design signature. A route line on a map projects false certainty —
 * one clean stroke, no indication of which parts the data actually vouches for.
 * The strip shows both at once: colour is sun exposure, hatching is inferred
 * data. Where it looks textured, the tool is telling you it does not know.
 */
export function ExposureStrip({
  edges,
  hourIdx,
  className = "",
}: {
  edges: Edge[];
  hourIdx: number;
  className?: string;
}) {
  const 帶 = useRef<HTMLDivElement>(null);

  // 段依序自左而張,如路之見於目前。此為此物之一動,餘皆靜。
  useLayoutEffect(() => {
    const 根 = 帶.current;
    if (!根) return;
    const 的 = [...根.children] as HTMLElement[];
    if (的.length === 0) return;
    // 雖段多至數百,全掃不過半秒 —— 久則非動,乃待也。
    const 間 = Math.min(0.01, 0.5 / 的.length);
    return 安動(
      的,
      () =>
        animate(
          的,
          { scaleX: [0, 1], opacity: [0.4, 1] },
          { duration: 時微, ease: 曲微, delay: stagger(間) },
        ),
      (時微 + 間 * 的.length) * 1000,
    );
  }, [edges, hourIdx]);

  const 總 = edges.reduce((s, e) => s + e.length_m, 0);
  if (總 === 0) return null;

  return (
    <div className={className}>
      <div
        ref={帶}
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
                backgroundColor: 曝之色(曝),
                transformOrigin: "left",
              }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
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
