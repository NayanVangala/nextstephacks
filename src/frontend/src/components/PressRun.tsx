import type { CityPack } from "../types";

/**
 * 印之記。
 *
 * riso 之印,其邊恆有一行小字:版次、墨數、印日。非飾也 —— 一版之出,
 * 必自言其所從出,不然則觀者無以知其所見者何時之物。
 *
 * 此器亦然,而其所當言者三:所模之刻、其囊之所建、其高之所推者幾何。
 * 三者前此皆在,而皆退於其末之小字 —— 是所以信其數者,反藏於其數之後。
 * 今升為一條,橫於其面,與其數同見。
 *
 * The colophon on a Riso print: run, inks, date, printed along the edge. Not
 * decoration — a pull that does not say what it is leaves the viewer unable to
 * date what they are looking at.
 *
 * The same three facts govern every number this tool shows: which hour was
 * modelled, when the pack was built, and how much of the building height behind
 * the shade model was assumed rather than published. All three existed already,
 * and all three were demoted to fine print underneath the figures they qualify.
 * This puts them on the surface, in the reader's path.
 *
 * 其為 aside 而非 footer —— 一頁一 footer,而此可與其面並列。
 */
export function PressRun({
  pack,
  hourIdx,
  className = "",
}: {
  pack: CityPack;
  hourIdx: number;
  className?: string;
}) {
  const 刻 = pack.manifest.hour_buckets?.[hourIdx];
  const 總 = pack.manifest.buildings_total ?? 0;
  const 補 = pack.manifest.buildings_assumed_height ?? 0;
  // 推之比。無其樓則不可言 —— 零與「未有其數」不可混。
  const 推之率 = 總 > 0 ? Math.round((補 / 總) * 100) : null;

  const 建之日 = pack.manifest.generated_at
    ? new Date(pack.manifest.generated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <aside
      aria-label="How this was computed"
      className={`印之記 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-2.5 text-xs text-muted-foreground ${className}`}
    >
      {刻 != null && (
        <span>
          Modelled at{" "}
          <span className="数 font-semibold text-foreground">
            {String(刻).padStart(2, "0")}:00
          </span>
        </span>
      )}

      {/*
        推之比,必與其紋同見 —— 紋言其有所推,而此言其幾何。
        逾其半則其字亦錯出一線:此頁之疑,不獨賴其色。
        The hatch says some of this is inferred; this says how much. Past half,
        the figure itself prints out of register, so the severity survives for a
        reader who cannot tell the three inks apart.
      */}
      {推之率 != null && (
        <span>
          Shade computed from{" "}
          <span className="数 font-semibold text-foreground">
            {總.toLocaleString()}
          </span>{" "}
          footprints,{" "}
          <span
            className={`数 font-semibold text-foreground ${推之率 >= 50 ? "失準" : ""}`}
          >
            {推之率}%
          </span>{" "}
          at an assumed height
        </span>
      )}

      {建之日 && (
        <span className="ms-auto">
          Pack built <span className="数">{建之日}</span>
        </span>
      )}
    </aside>
  );
}
