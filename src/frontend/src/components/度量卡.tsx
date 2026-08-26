export function 度量卡({
  題,
  數,
  註,
}: {
  題: string;
  數: string;
  註?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "0.85rem 1rem",
        background: "var(--panel)",
      }}
    >
      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{題}</div>
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {數}
      </div>
      {註 && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{註}</div>}
    </div>
  );
}
