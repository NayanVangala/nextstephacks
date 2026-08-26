import { Card } from "@/components/ui/card";

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
    <Card className="gap-0 px-4 py-3">
      <div className="text-xs text-muted-foreground">{題}</div>
      <div className="数 text-3xl font-semibold tracking-tight">{數}</div>
      {註 && <div className="mt-0.5 text-xs text-muted-foreground">{註}</div>}
    </Card>
  );
}
