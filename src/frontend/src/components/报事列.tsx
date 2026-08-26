import { Badge } from "@/components/ui/badge";
import type { 报 } from "../data/本地庫";

const 類之文: Record<报["kind"], string> = {
  curb_cut_broken: "Curb cut broken",
  sidewalk_blocked: "Sidewalk blocked",
  no_shade: "No shade",
  closed_facility: "Facility closed",
  other: "Other",
};

export function 报事列({
  报列,
  同步中,
  供給有無,
}: {
  报列: 报[];
  同步中: boolean;
  供給有無: boolean;
}) {
  return (
    <section aria-label="Reported problems" className="mt-6">
      <h2 className="text-lg font-semibold">
        Reported problems <span className="数 text-muted-foreground">({报列.length})</span>
        {同步中 && <span className="ml-2 text-sm font-normal text-muted-foreground">syncing…</span>}
      </h2>

      {!供給有無 && (
        <p role="note" className="mt-1 text-sm text-midsun">
          Reports are stored on this device only — no server is configured, so nothing
          you submit is shared with other people yet.
        </p>
      )}

      {报列.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing reported here yet.
        </p>
      ) : (
        <ul className="mt-2 text-sm">
          {报列.slice(0, 20).map((r) => (
            <li key={r.id} className="border-b border-line py-2 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold">{類之文[r.kind]}</span>
                <Badge variant={r.status === "confirmed" ? "default" : "outline"}>
                  {r.status}
                </Badge>
                <span className="数 text-xs text-muted-foreground">
                  segment {r.edge_id}
                </span>
              </div>
              {r.note && <p className="mt-0.5 text-muted-foreground">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        Unverified reports come from other pedestrians and have not been checked. They
        raise the cost of a segment in routing; they never make one look safer.
      </p>
    </section>
  );
}
