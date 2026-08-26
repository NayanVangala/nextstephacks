import { useMemo, useState } from "react";
import type { CityPack } from "../types";
import { 可選之地 } from "../report/可選之地";
import { Button } from "@/components/ui/button";

/**
 * 起訖之選,可以鍵盤為之。
 *
 * A NATIVE select, deliberately. Browsers give it type-ahead, arrow-key
 * navigation, and screen-reader announcement for free, and every one of those
 * is more reliable than a hand-rolled ARIA combobox. In the one component whose
 * entire reason for existing is keyboard and screen-reader access, matching a
 * custom widget's look is not worth the risk.
 */
export function PlacePicker({
  pack,
  label,
  value,
  onChange,
  allowLocate = false,
}: {
  pack: CityPack;
  label: string;
  value: number | null;
  onChange: (nodeId: number | null, 名: string | null) => void;
  allowLocate?: boolean;
}) {
  const 群 = useMemo(() => 可選之地(pack), [pack]);
  const [定位中, set定位中] = useState(false);
  const [定位之誤, set定位之誤] = useState<string | null>(null);

  const id = `place-${label.toLowerCase().replace(/\s+/g, "-")}`;

  const 用我之地 = () => {
    if (!("geolocation" in navigator)) {
      set定位之誤("This browser cannot report your location.");
      return;
    }
    set定位中(true);
    set定位之誤(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set定位中(false);
        // 就近取節之事,呼者為之 —— 其知 profile 故也。
        onChange(-1, `${pos.coords.longitude},${pos.coords.latitude}`);
      },
      (err) => {
        set定位中(false);
        set定位之誤(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was declined. Choose a place from the list instead."
            : "Could not get your location. Choose a place from the list instead.",
        );
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className="my-3">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(ev) => {
          const v = ev.target.value;
          if (!v) return onChange(null, null);
          const n = Number(v);
          const 名 = ev.target.selectedOptions[0]?.textContent ?? null;
          onChange(n, 名);
        }}
        className="w-full rounded-md border border-line bg-paper px-2 py-2 text-sm"
      >
        <option value="">Choose a place…</option>
        {群.map((g) => (
          <optgroup key={g.類} label={g.文}>
            {g.地.map((d) => (
              <option key={d.id} value={d.node_id!}>
                {d.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {allowLocate && (
        <>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={用我之地}
            disabled={定位中}
          >
            {定位中 ? "Locating…" : "Use my location"}
          </Button>
          {定位之誤 && (
            <p role="alert" className="mt-1 text-xs text-fullsun">
              {定位之誤}
            </p>
          )}
        </>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        You can also select a point directly on the map.
      </p>
    </div>
  );
}
