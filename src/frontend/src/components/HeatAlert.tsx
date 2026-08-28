import type { 警之狀 } from "../data/警";
import { 暑之底, 限之減 } from "../data/警";

/**
 * 官警之告。
 *
 * The alert changes routing, so this panel states exactly what it changed and
 * who issued it. An alert that silently stiffens your route is worse than no
 * alert: the user cannot tell whether the detour they are being shown is the
 * model's judgement or the weather service's, and cannot check either.
 *
 * 三狀不可混:未取、取而不得、取而無警。
 * Three states, never conflated: not fetched, fetch failed, fetched and clear.
 * Rendering a failure as "no alerts" would tell a heat-sensitive person the
 * coast is clear on a day nobody actually checked.
 */
export function HeatAlert({ 狀 }: { 狀: 警之狀 }) {
  // 未取。靜候而已,不佔其位。
  if (狀.警 === null && 狀.誤 === null) return null;

  // 取而不得。明告之 —— 不可默然作無警論。
  if (狀.誤) {
    return (
      <p
        role="note"
        className="mt-2 rounded-lg border border-line bg-panel px-4 py-3 text-sm text-muted-foreground"
      >
        <span className="font-semibold text-ink">
          Heat alerts could not be checked.
        </span>{" "}
        The National Weather Service did not answer, so routing is using measured
        temperature alone. This is not the same as there being no alert — check{" "}
        <a
          href="https://www.weather.gov/"
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          weather.gov
        </a>{" "}
        before you travel. <span className="text-xs">({狀.誤})</span>
      </p>
    );
  }

  // 取而無警。亦當言之 —— 「已問而無」與「未問」異。
  if (狀.警 && 狀.警.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No active National Weather Service heat alerts for this area.
      </p>
    );
  }

  const 警 = 狀.警!;
  const 底 = 暑之底(警);
  const 減 = 限之減(警);
  const 重 = 底 >= 0.85;

  return (
    <section
      aria-label="Active heat alert"
      role="alert"
      className={`mt-2 rounded-lg border px-4 py-3 text-sm ${
        重 ? "border-fullsun/50 bg-fullsun-soft" : "border-midsun/50 bg-midsun-soft"
      }`}
    >
      {警.map((a, i) => (
        <div key={`${a.event}-${i}`} className={i > 0 ? "mt-3 border-t border-ink/10 pt-3" : ""}>
          <p className="font-semibold">
            {a.event}
            {a.severity !== "Unknown" && (
              <span className="ml-2 text-xs font-normal">severity: {a.severity}</span>
            )}
          </p>
          {a.headline && <p className="mt-0.5 text-sm">{a.headline}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Issued by {a.sender}
            {a.expires && (
              <>
                {" · expires "}
                <span className="数">
                  {new Date(a.expires).toLocaleString(undefined, {
                    weekday: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </>
            )}
          </p>
        </div>
      ))}

      {/* 所改者必明言之。 */}
      <p className="mt-3 border-t border-ink/10 pt-2 text-xs">
        <span className="font-semibold">What this changed:</span> routing is
        treating heat severity as at least{" "}
        <span className="数 font-semibold">{Math.round(底 * 100)}%</span> regardless
        of the thermometer, and the reach budget is cut to{" "}
        <span className="数 font-semibold">{Math.round(減 * 100)}%</span> of normal.
        Both only ever make the tool more cautious — an alert can never make it
        say you can reach somewhere it would otherwise have ruled out.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        This is a routing heuristic, not medical guidance. Follow your own
        clinical advice about heat.
      </p>
    </section>
  );
}
