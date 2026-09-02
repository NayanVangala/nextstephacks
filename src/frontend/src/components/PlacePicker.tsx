import { useEffect, useMemo, useState } from "react";
import type { CityPack } from "../types";
import { 可選之地 } from "../report/可選之地";
import { 求地, type 地之候 } from "../data/地名";
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
  const [詞, set詞] = useState("");
  const [候, set候] = useState<地之候[] | null>(null);
  const [求中, set求中] = useState(false);
  const [求之誤, set求之誤] = useState<string | null>(null);

  const id = `place-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const 求id = `${id}-search`;

  /*
    書而後求,遲六百毫秒。
    Nominatim 之約:一秒一求。若逐鍵而求,則「Main Street」一詞十有一求,
    是自取其閉。遲之,又廢其前求,則一詞之中所發者一二而已。
    Nominatim's usage policy is one request per second. Debounced at 600ms and
    every in-flight request aborted on the next keystroke, so typing a street
    name issues one or two requests rather than one per character.
  */
  useEffect(() => {
    const q = 詞.trim();
    if (q.length < 3) {
      set候(null);
      set求之誤(null);
      set求中(false);
      return;
    }
    const ac = new AbortController();
    set求中(true);
    const t = setTimeout(() => {
      求地(q, pack.manifest.bbox, ac.signal)
        .then((r) => {
          set候(r);
          set求之誤(null);
        })
        .catch((e: Error) => {
          if (e.name === "AbortError") return;
          // 默然而歸於空,則人以為無此地,實未嘗問也。
          set候(null);
          set求之誤("Could not reach the search service. Choose a place from the list, or tap the map.");
        })
        // 廢者不解其旗 —— 其拒落於新求立旗之後,解之則新求無告。
        // An aborted request must not clear the flag: its rejection lands in a
        // later microtask than the next run's set求中(true), so clearing here
        // silences the live region while a request is genuinely in flight.
        .finally(() => {
          if (!ac.signal.aborted) set求中(false);
        });
    }, 600);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [詞, pack]);

  /*
    擇一候,則就近取節 —— 與「用我之地」同其路,見 RouteView 之 擇地。
    其名必自存之:所就之節不在「可選之地」之中,故其單無此節而顯為空白,
    人乃不知所擇者為何。存其名而別書之,則其擇可驗。
    The snapped node is not one of the curated places, so the select renders
    blank (selectedIndex -1) rather than showing what was chosen. Keeping the
    label here is what lets the user see which place they picked.
  */
  const [所擇之名, set所擇之名] = useState<string | null>(null);

  const 擇候 = (c: 地之候) => {
    set詞("");
    set候(null);
    set所擇之名(c.label);
    onChange(-1, `${c.lon},${c.lat}`);
  };

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
    <div className="mb-4">
      <label htmlFor={求id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>

      {/*
        書其名而求之。
        非 ARIA combobox —— 但一 input,一 list of buttons,一 live region。
        手造之 combobox,其鍵盤與讀屏之行最易誤,而此器所以存,正為賴之者。
        列在 input 之後而為其常,故 tab 自及之,不須 aria-activedescendant。
        Deliberately NOT an ARIA combobox: a plain input, a plain list of
        buttons, and a live region for the count. A hand-rolled combobox is the
        single easiest widget to get wrong for keyboard and screen-reader users,
        and this is the component they depend on most. The results are ordinary
        focusable buttons in DOM order, so Tab reaches them with no roving
        tabindex or aria-activedescendant to get wrong.
      */}
      <input
        id={求id}
        type="search"
        value={詞}
        onChange={(ev) => set詞(ev.target.value)}
        placeholder="Search for a street or place…"
        autoComplete="off"
        aria-describedby={`${求id}-hint`}
        className="min-h-11 w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm"
      />

      <p id={`${求id}-hint`} className="mt-1 text-xs text-muted-foreground">
        Type at least three letters. Only places inside the mapped area are
        shown.
      </p>

      {/* 求之狀與其數,必以言告之 —— 不可但以其列之見否為告。 */}
      <p role="status" aria-live="polite" className="sr-only">
        {求中
          ? "Searching"
          : 候 == null
            ? ""
            : 候.length === 0
              ? "No matching places found"
              : `${候.length} place${候.length === 1 ? "" : "s"} found`}
      </p>

      {求中 && (
        <p className="mt-1.5 text-xs text-muted-foreground">Searching…</p>
      )}

      {求之誤 && (
        <p role="alert" className="mt-1.5 text-xs text-error">
          {求之誤}
        </p>
      )}

      {候 != null && !求中 && 候.length === 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Nothing by that name inside the mapped area. Try a nearby cross
          street, or tap the map.
        </p>
      )}

      {候 != null && 候.length > 0 && (
        <ul className="mt-1.5 divide-y divide-line rounded-md border border-line">
          {候.map((c) => (
            <li key={`${c.lon},${c.lat},${c.label}`}>
              <button
                type="button"
                onClick={() => 擇候(c)}
                className="min-h-11 w-full px-2.5 py-2 text-left text-sm hover:bg-panel"
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 其名必冠以起訖 —— 不然則二單同名,讀屏者不能別其一。 */}
      <label htmlFor={id} className="mt-3 mb-1 block text-sm font-semibold">
        {label} — or choose a known place
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(ev) => {
          const v = ev.target.value;
          set所擇之名(null);
          if (!v) return onChange(null, null);
          const n = Number(v);
          const 名 = ev.target.selectedOptions[0]?.textContent ?? null;
          onChange(n, 名);
        }}
        className="min-h-11 w-full rounded-md border border-line bg-paper px-2.5 py-2 text-sm"
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
            <p role="alert" className="mt-1 text-xs text-error">
              {定位之誤}
            </p>
          )}
        </>
      )}

      {/* 所擇者若出於求,則其單空白 —— 故必自書其名,使人知所擇為何。 */}
      {所擇之名 && value != null && (
        <p className="mt-1.5 text-sm">
          <span className="text-muted-foreground">Using: </span>
          <span className="font-semibold">{所擇之名}</span>
        </p>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        You can also select a point directly on the map.
      </p>
    </div>
  );
}
