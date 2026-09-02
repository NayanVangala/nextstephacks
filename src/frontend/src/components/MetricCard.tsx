import { motion, useReducedMotion } from "motion/react";
import { Card } from "@/components/ui/card";
import { useCountUp, 解數 } from "../landing/useCountUp";
import { 曲巨, 時中 } from "../motion/预设";

/**
 * 其數自零而升。
 *
 * landing 之四數皆升,而器中之四數靜 —— 是同一物而二手。且此升非為飾:
 * 其行之際,人之目自隨之,故所當讀者不待指而自明。
 * 凡不可解為數者(「—」「n/a」之類)直書之,不強為之升。
 * The landing's figures count up and the tool's identical four-up row did not.
 * The motion also earns its place: the eye follows a moving number, so the
 * thing to read announces itself. Anything unparseable is rendered as-is.
 */
function MetricFigure({ 數 }: { 數: string }) {
  const 解 = 解數(數);
  const 減 = useReducedMotion();
  const { ref, 值 } = useCountUp(解?.數 ?? 0, { 時: 700 });
  if (!解 || 減) return <>{數}</>;
  /*
    其位數必從其所書者,不可自度之。
    前此以「其數小於百則一位」為法 —— 而「99.0%」之數正為九十九,其餘為零,
    遂書為「99%」,是奪其一位有效之數。所書者為所量之精,非此處所可改。
    MUST take the precision from the source string. The old rule inferred it
    from the value, so a deliberate "99.0%" rendered as "99%" — dropping a
    significant figure the measurement chose to publish.
  */
  const 位 = /\.(\d+)/.exec(數)?.[1].length ?? 0;
  const 文 =
    位 > 0
      ? 值.toFixed(位)
      : 解.數 >= 1000
        ? Math.round(值).toLocaleString()
        : String(Math.round(值));
  return (
    <span ref={ref}>
      {解.前}
      {文}
      {解.後}
    </span>
  );
}

export function MetricCard({
  題,
  數,
  註,
  序 = 0,
}: {
  題: string;
  數: string;
  註?: string;
  /** 其序,所以錯落其入也。 */
  序?: number;
}) {
  const 減 = useReducedMotion();
  return (
    /*
      懸則其界稍明。無影 —— 所法者舉site無一 box-shadow,而此樹亦然。
      所易者惟其色,故不移其位,亦不使其鄰重排。
      A border lift on hover, not a shadow: the reference uses none anywhere and
      neither does this app. Colour-only, so nothing shifts or reflows.
    */
    /*
      其界用 ring,不用 border。Card 之本樣為 ring-1 而無 border-width,
      又 tailwind v4 之 preflight 立 border: 0 solid —— 故前此之 border-line
      與 hover:border-... 皆着色於一無廣之界,其「懸則界明」未嘗一見。
      Card's base is `ring-1 ring-foreground/10` with no border WIDTH, and
      Tailwind v4 preflight sets `border: 0 solid`. The border-line and hover
      classes here were colouring a zero-width border: the documented hover lift
      had never once fired.
    */
    <motion.div
      initial={減 ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={減 ? { duration: 0 } : { duration: 時中, ease: 曲巨, delay: 序 * 0.06 }}
    >
    <Card className="gap-0 px-4 py-3.5 ring-1 ring-line transition-[box-shadow] duration-200 ease-quint hover:ring-accent-ink/50">
      {/* 籤為刻,故等寬;而其註為語,故仍其常 —— 註者句也,非刻也。 */}
      {/*
        籤之高必齊。四卡之籤,長短不一(十九字至三十八字),故其一行其一二行,
        而其數遂落於二基線,參差十五像素 —— 四數並列而不齊,最見其未成。
        The four labels are 19-38 characters into the same column, so two wrapped
        to one line and two to two, putting the big numbers on two baselines 15px
        apart. A four-up KPI row that does not align reads as unfinished.
      */}
      <div className="籤 min-h-[2.6em] text-muted-foreground">{題}</div>
      {/*
        其數當為此卡之主。前此三十像素,僅倍其文有半,故沒於一片十四之中;
        而人所決者正在此數。今四十,且收其距。
        The figure is what the card is for. At 30px it was only 2.1x the body
        text it sat in and read as just more text; this is the number being
        decided on.
      */}
      <div className="数 mt-1.5 text-[2.5rem] font-semibold leading-none tracking-[-0.03em]">
        <MetricFigure 數={數} />
      </div>
      {註 && <div className="mt-2 text-xs text-muted-foreground">{註}</div>}
    </Card>
    </motion.div>
  );
}
