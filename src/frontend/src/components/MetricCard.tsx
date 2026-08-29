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
    /*
      懸則其界稍明。無影 —— 所法者舉site無一 box-shadow,而此樹亦然。
      所易者惟其色,故不移其位,亦不使其鄰重排。
      A border lift on hover, not a shadow: the reference uses none anywhere and
      neither does this app. Colour-only, so nothing shifts or reflows.
    */
    <Card className="gap-0 border-line px-4 py-3.5 transition-colors duration-200 ease-quint hover:border-muted-foreground/40">
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
