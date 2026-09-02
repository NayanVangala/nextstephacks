import { Badge } from "@/components/ui/badge";
import type { Destination } from "../types";

const 類之文: Record<string, string> = {
  cooling_center: "Cooling center",
  evacuation_center: "Evacuation center",
  rest_stop: "Rest stop",
  transit_stop: "Transit stop",
};

function 一行(d: Destination, showPower: boolean) {
  return (
    <li key={d.id} className="border-b border-line py-2 last:border-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-semibold">{d.name}</span>
        <Badge variant="secondary">{類之文[d.kind] ?? d.kind}</Badge>
        {showPower && (
          <Badge variant={d.backup_power === "yes" ? "default" : "outline"}>
            backup power: {d.backup_power}
          </Badge>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{d.source}</p>
    </li>
  );
}

export function DestinationList({
  reachable,
  unreachable,
  showPower,
}: {
  reachable: Destination[];
  unreachable: Destination[];
  showPower: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-base font-semibold">
          Reachable <span className="数 text-muted-foreground">({reachable.length})</span>
        </h3>
        {reachable.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No designated destination is reachable within this budget.
          </p>
        ) : (
          <ul>{reachable.map((d) => 一行(d, showPower))}</ul>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-base font-semibold">
          Not reachable <span className="数 text-muted-foreground">({unreachable.length})</span>
        </h3>
        {unreachable.length > 0 && (
          <ul>{unreachable.slice(0, 20).map((d) => 一行(d, showPower))}</ul>
        )}
      </div>

      {showPower && (
        <p className="纹-medium rounded border border-line p-3 text-xs text-muted-foreground md:col-span-2">
          Backup-power status is not published for most sites, so most entries read
          “unknown”. Unknown means unknown — not that power is available.
        </p>
      )}
    </div>
  );
}
