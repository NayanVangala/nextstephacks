import type { CityPack, Edge, ProfileFlags } from "../types";
import { edgeAllowed } from "./graph";
import { route } from "./astar";

/**
 * 無路之時,名其所阻。
 *
 * "No route exists for this profile" is true and useless. A wheelchair user who
 * hits it already knows the city failed them; what they cannot see is WHERE, or
 * whether it is one staircase or a whole severed district. Naming the barrier
 * turns a dead end into something a person can report, route around, or take to
 * a council meeting.
 *
 * 法:再尋一路,不設其身之限。若得之,則其路之上,此身所不可過者,即所阻也。
 * Method: search again with no profile filter. If THAT succeeds, the edges on
 * that path which this profile cannot use are precisely the barrier. If it also
 * fails, the two points are not connected for anyone and the barrier is not
 * accessibility at all.
 */

export type 阻之類 =
  | "steps"
  | "kerb"
  | "incline"
  | "surface"
  | "width"
  | "tagged_no"
  | "other";

export interface 阻之項 {
  類: 阻之類;
  數: number;
  米: number;
  /** 階之數,若籤有之。可為 null —— 有階而不知其級數,常也。 */
  階數: number | null;
}

export interface 阻之報 {
  /** 眾人亦不可至 —— 則非身之故,乃網之斷。 */
  眾人亦不可至: boolean;
  項: 阻之項[];
  /** 所阻之段共幾 —— 諸類之和。 */
  總數: number;
}

/** 一段何以不可過。次序即其確信之次序:籤明言者先,推者後。 */
function 何故(e: Edge, flags: ProfileFlags): 阻之類 | null {
  if (!flags.wheelchair) return null;
  if (e.is_steps) return "steps";
  if (e.wheelchair_tag === "no") return "tagged_no";
  if (e.kerb === "raised" && e.is_crossing) return "kerb";
  if (e.incline_pct != null && Math.abs(e.incline_pct) > 8.33) return "incline";
  if (e.width_m != null && e.width_m < 0.9) return "width";
  if (e.surface != null) return "surface";
  return "other";
}

const 無身: ProfileFlags = {
  wheelchair: false,
  blind_low_vision: false,
  heat_sensitive: false,
};

export function 阻之故(
  pack: CityPack,
  flags: ProfileFlags,
  startId: number,
  goalId: number,
  hourIdx: number,
  tempC: number,
): 阻之報 | null {
  // 身無所限,則無所謂阻。
  if (!flags.wheelchair && !flags.blind_low_vision && !flags.heat_sensitive) {
    return null;
  }

  const 眾人之路 = route(pack, 無身, startId, goalId, hourIdx, tempC);
  if (!眾人之路) {
    return { 眾人亦不可至: true, 項: [], 總數: 0 };
  }

  const 聚 = new Map<阻之類, 阻之項>();
  for (const e of 眾人之路.edges) {
    if (edgeAllowed(e, flags)) continue;
    const 類 = 何故(e, flags) ?? "other";
    const 有 = 聚.get(類);
    if (有) {
      有.數 += 1;
      有.米 += e.length_m;
      if (有.階數 == null && e.step_count != null) 有.階數 = e.step_count;
      else if (有.階數 != null && e.step_count != null) 有.階數 += e.step_count;
    } else {
      聚.set(類, { 類, 數: 1, 米: e.length_m, 階數: e.step_count });
    }
  }

  const 項 = [...聚.values()].sort((a, b) => b.數 - a.數);
  return {
    眾人亦不可至: false,
    項,
    總數: 項.reduce((s, x) => s + x.數, 0),
  };
}

/** 阻之文。UI copy — 名其實,不誇。 */
export const 阻之文: Record<阻之類, string> = {
  steps: "steps",
  kerb: "raised kerbs at crossings",
  incline: "grades steeper than the ADA maximum",
  surface: "unpaved surface",
  width: "sidewalk under 0.9 m wide",
  tagged_no: "segments tagged as not wheelchair accessible",
  other: "segments this profile excludes",
};
