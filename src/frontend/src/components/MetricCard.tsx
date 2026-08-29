import { Card } from "@/components/ui/card";

export function MetricCard({
  題,
  數,
  註,
}: {
  題: string;
  數: string;
  註?: string;
}) {
  return (
    <Card className="gap-0 px-4 py-3.5">
      {/* 籤為刻,故等寬;而其註為語,故仍其常 —— 註者句也,非刻也。 */}
      <div className="籤 text-muted-foreground">{題}</div>
      {/*
        其數當為此卡之主。前此三十像素,僅倍其文有半,故沒於一片十四之中;
        而人所決者正在此數。今四十,且收其距。
        The figure is what the card is for. At 30px it was only 2.1x the body
        text it sat in and read as just more text; this is the number being
        decided on.
      */}
      <div className="数 mt-1.5 text-[2.5rem] font-semibold leading-none tracking-[-0.03em]">
        {數}
      </div>
      {註 && <div className="mt-2 text-xs text-muted-foreground">{註}</div>}
    </Card>
  );
}
