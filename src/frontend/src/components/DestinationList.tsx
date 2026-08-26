import type { Destination } from "../types";

const KIND_LABEL: Record<string, string> = {
  cooling_center: "Cooling centre",
  evacuation_center: "Evacuation centre",
  rest_stop: "Rest stop",
};

export function DestinationList({
  reachable,
  unreachable,
  showPower,
}: {
  reachable: Destination[];
  unreachable: Destination[];
  showPower: boolean;
}) {
  const row = (d: Destination) => (
    <li key={d.id} style={{ marginBottom: "0.5rem" }}>
      <strong>{d.name}</strong> — {KIND_LABEL[d.kind] ?? d.kind}
      {showPower && (
        <>
          {" · backup power: "}
          <span style={{ fontWeight: 600 }}>{d.backup_power}</span>
        </>
      )}
      <br />
      <small style={{ color: "var(--muted)" }}>{d.source}</small>
    </li>
  );

  return (
    <div>
      <h3>Reachable ({reachable.length})</h3>
      {reachable.length === 0 ? (
        <p role="note">No designated destination is reachable within this budget.</p>
      ) : (
        <ul>{reachable.map(row)}</ul>
      )}

      <h3>Not reachable ({unreachable.length})</h3>
      {unreachable.length > 0 && <ul>{unreachable.slice(0, 20).map(row)}</ul>}

      {showPower && (
        <p role="note">
          Backup-power status is not published for most sites, so most entries read
          “unknown”. Unknown means unknown — not that power is available.
        </p>
      )}
    </div>
  );
}
