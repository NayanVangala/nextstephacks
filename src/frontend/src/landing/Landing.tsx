import { useRef } from "react";
import { SplitText } from "./SplitText";
import { DifferenceCursor } from "./DifferenceCursor";
import { Marquee } from "./Marquee";
import { Nav } from "./Nav";
import { HeatField } from "./HeatField";
import { ReachField } from "./ReachField";
import { ScrollThread } from "./ScrollThread";
import { useCountUp, 解數 } from "./useCountUp";
import { Reveal, RevealGroup, RevealItem, RevealRule } from "./motion";
import { useSunScroll } from "./useSunScroll";
import { useSmoothScroll } from "./useSmoothScroll";
import { Magnetic } from "./Magnetic";
import { SunDial } from "./SunDial";
import { NetGlyph, type 式 } from "./NetGlyph";

/**
 * 其度皆量於所法者,非所擬者。see index.css 之「landing 之度」。
 *
 * The previous version interpolated every size with clamp(), producing a smooth
 * gradient from 12px to 154px that read as mush. Measured with Playwright, the
 * reference site is deliberately bimodal: 16px for essentially all text, then a
 * violent jump to display sizes, with almost nothing between. That gap IS the
 * design, and interpolating across it destroyed it.
 */

/** 節。上下各七十二 —— 量之,其二十八處皆然。 */
function Section({
  children, id, label, className = "",
}: {
  children: React.ReactNode; id?: string; label: string; className?: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={`landing-sec sun-rule-soft scroll-mt-16 border-t ${className}`}
    >
      <div className="grid-container">{children}</div>
    </section>
  );
}

/** 節之標:十六而輕。前此十二而重,故其標壓於其文;今則讓之。 */
function SectionLabel({ children }: { children: string }) {
  return (
    <Reveal>
      <p className="landing-label mb-10 flex items-center gap-[20px] text-white/50">
        <span aria-hidden className="sun-mark inline-block h-px w-10" />
        {children}
      </p>
    </Reveal>
  );
}

function CountUpFigure({ n, 延 }: { n: string; 延: number }) {
  const 解 = 解數(n);
  const { ref, 值 } = useCountUp(解?.數 ?? 0, { 延: 延 * 1000 });
  if (!解) return <>{n}</>;
  const 文 = 解.數 < 100 ? 值.toFixed(0) : Math.round(值).toLocaleString();
  return <span ref={ref}>{解.前}{文}{解.後}</span>;
}

/**
 * 一數。無框無角。
 * No card border and no 14px radius: the reference uses full pills or nothing
 * in between. A hairline rule and space do the separating.
 */
function Figure({
  n, t, s: sub, i, 缺 = false,
}: { n: string; t: string; s: string; i: number; 缺?: boolean }) {
  return (
    <RevealItem>
      {/*
        其上之緣。所量者一髮,所缺者紋之 —— 讀者不待其文而已知此數異乎其餘。
        A hairline for a measured figure, the hatch for a missing one, so the
        reader can see which of these numbers is a gap before reading a word of
        it. Same mark the app uses on inferred segments.
      */}
      <div aria-hidden className={缺 ? "纹-sun h-2" : "sun-bar h-px"} />
      {/* 其階本二極 —— 五點五為其「中」,正 index.css 所自戒者。 */}
      <div className="数 landing-display h-2xl mt-5">
        <CountUpFigure n={n} 延={i * 0.08 + 0.15} />
      </div>
      <div className="t-xs mt-4">{t}</div>
      <div className="t-xs mt-1 text-white/50">{sub}</div>
    </RevealItem>
  );
}

const 數: { n: string; t: string; s: string; 缺?: boolean }[] = [
  { n: "136k", t: "sidewalk segments", s: "modelled across seven US downtowns" },
  { n: "484", t: "census block groups", s: "scored for step-free connectivity" },
  { n: "91%", t: "of Phoenix buildings", s: "have no published height at all", 缺: true },
  { n: "0", t: "accounts required", s: "everything runs in your browser" },
];

const 何以為之 = [
  { n: "01", h: "Tell it who you are",
    p: "Wheelchair user, heat-sensitive, blind or low vision. The profile changes which sidewalk counts as passable at all, not just how it ranks." },
  { n: "02", h: "Pick two points, and an hour",
    p: "Sun exposure is modelled for every segment at eight times of day, from building shadows projected against the sun's real position." },
  { n: "03", h: "Walk it, or find out why you cannot",
    p: "You get a route and a written itinerary. When no route exists it names the barrier — three flights of steps, 60 m of them." },
];

/*
  三者並列,非有先後 —— 故無其序。前此編之為 01/02/03,而人讀之若步驟,
  以為必先 ROUTE 而後 REACH。其上之「何以為之」則真有其序,故其序存。
  These three are parallel views, not steps, so they carry no numbers. They were
  numbered 01/02/03, which reads as a sequence you must follow in order. The
  section above it genuinely IS a sequence and keeps its numbering.
*/
const 事: { h: string; p: string; 式: 式 }[] = [
  { h: "ROUTE", 式: "route",
    p: "Every routing app optimises for shortest. A handful optimise for shade. None optimise for both at once, and the step-free path is usually the longer, more exposed one." },
  { h: "REACH", 式: "reach",
    p: "Not where you want to go, but where you can actually get. Run the graph to exhaustion under a heat budget and ask whether any cooling centre falls inside it." },
  { h: "REPORT", 式: "report",
    p: "98.9% of the network is traversable, which sounds close to solved. It is the wrong number. 488 points of usable sidewalk cannot be reached at all." },
];

const 所發現 = [
  "LA Metro's public feeds omit the GTFS wheelchair_boarding field entirely — not blank, absent — across all 299 stops in the study area.",
  "Its canceled-service endpoint answers 200, with open CORS and well-formed JSON. The data is from October 2022.",
  "Phoenix publishes building heights for 9% of downtown. It is the hottest city here and has the worst shade data by a wide margin.",
  "We looked for a link between shade and household income. Across 484 block groups we could not find one that survives the margins of error, and the tool says so.",
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  // 捲即時 —— 全頁之界與記,隨其所至而行於曝之階。
  const 頁 = useRef<HTMLDivElement>(null);
  useSunScroll(頁);
  // 平捲。止於此頁 —— 器之中有圖有桿,不可奪其輪。見 useSmoothScroll 之註。
  useSmoothScroll();
  /*
    其地由 index.css 之 .landing 主之,此不復書 bg-black —— 前此並書之,
    雖為其 CSS 所勝(彼不在 layer 中),而讀者見之必以為黑。一物一處書之。
    The ground lives in index.css's .landing rule. The className also said
    bg-black, which lost to that unlayered rule but would mislead anyone reading
    the component — and would silently win back if the CSS ever moved into a layer.
  */
  return (
    <div ref={頁} className="landing text-white">
      <DifferenceCursor />
      <Nav onEnter={onEnter} />
      <ScrollThread 節數={4} />

      <section
        id="top"
        aria-label="Introduction"
        className="relative flex min-h-svh flex-col justify-center overflow-hidden pt-[var(--layout-padding-top)]"
      >
        <HeatField />
        {/*
          幕止於其文之後。前此右亦覆一二之黑,而其網為此頁之所以立 ——
          幕之厚薄,當隨其文之所在,不當均覆其面。
          The scrim now clears completely on the right instead of holding 12%
          black across the whole hero. It exists to keep the headline legible,
          not to dim the thing the headline is about.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(6,8,12,0.88)_0%,rgba(6,8,12,0.72)_28%,rgba(6,8,12,0.34)_50%,rgba(6,8,12,0.04)_76%,rgba(6,8,12,0)_100%)]"
        />
        <div className="grid-container relative">
          {/*
            量之於一四二五:次行需一〇八〇,而其地一〇三七,短四三 ——
            故「A GEOMETRY.」不能一行。前此斷於字中而不覺,今詞不可斷,乃見之。
            減其頂(十點八至十 rem)與其縮(八至六 vw),則餘六十五,可容。
            Measured at 1425px: line two needs 1080px and has 1037px — 43px
            short, which is why it could never fit on one line. The old
            mid-word break hid that. Capping the size and easing the indent
            leaves ~65px of slack.
          */}
          <SplitText as="h1" text="HEAT HAS"
            className="landing-display h-3xl block" />
          <SplitText as="div" text="A GEOMETRY." 延={240}
            className="landing-display h-3xl block sm:pl-[6vw]" />

          <Reveal 延={0.5}>
            {/*
              網既明而幕既薄,則此文之下不復為純色,乃有網行其後。
              故提其色至八五,並加一影 —— 文在圖上者,其比不可以一數定之,
              當以其最劣處為度。影者,所以固其最劣處也。
              With the network brighter and the scrim thinner, this paragraph no
              longer sits on flat colour — lines pass behind it. Text over
              imagery cannot be judged by a single contrast number; it has to
              survive its worst pixel, which is what the shadow guarantees.
            */}
            <p className="t-xs mt-[36px] max-w-2xl text-white/85 [text-shadow:0_1px_12px_rgba(6,8,12,0.95)]">
              Heat-safe, step-free walking routes for disabled pedestrians. Built
              on real sidewalk data, projected building shadows, and an explicit
              account of what the data does not know.
            </p>
          </Reveal>

          <Reveal 延={0.65}>
            <div className="mt-[36px] flex flex-wrap items-center gap-[20px]">
              <Magnetic>
                <button
                  type="button"
                  onClick={onEnter}
                  className="t-xs rounded-full bg-white px-8 py-4 text-black transition-[opacity,scale] duration-150 ease-quint hover:scale-[1.03] hover:opacity-90"
                >
                  Open the tool
                </button>
              </Magnetic>
              <a
                href="#what"
                className="t-xs group inline-flex items-center gap-2 border-b border-white/30 pb-1 transition-colors duration-150 ease-quint hover:border-white"
              >
                How it works
                <span aria-hidden className="transition-transform duration-150 ease-quint group-hover:translate-y-1">↓</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="border-t border-white/10 py-[20px]">
        <Marquee items={[
          "OpenStreetMap", "Open-Meteo", "US Census TIGER", "ACS 5-year",
          "National Weather Service", "LA Metro GTFS", "King County Metro",
          "Client-side A*", "Projected shadows", "Works offline",
        ]} />
      </div>

      <Section id="what" label="What it is">
        <SectionLabel>What it is</SectionLabel>
        <Reveal>
          <h2 className="landing-display h-lg max-w-4xl">
            A routing tool that treats heat and step-free access as the same
            problem, because for a lot of people they are.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <p className="t-xs mt-[36px] max-w-2xl text-white/60">
            Passable models every sidewalk segment in seven downtowns for whether
            you can physically use it and how much sun falls on it, hour by hour.
            It runs entirely in your browser — no account, no server, no tracking —
            and it says plainly when the underlying data does not know something.
          </p>
        </Reveal>
        {/*
          其文言「影投於日之真位」而不示其影,是以言代示。此圖即其文。
          The copy claims shadows are projected against the sun's real position;
          until now the page asserted that and showed nothing.
        */}
        <Reveal 延={0.15}>
          <SunDial />
        </Reveal>
        <RevealGroup className="mt-[72px] grid gap-[36px] md:grid-cols-3">
          {何以為之.map((s) => (
            <RevealItem key={s.n} className="sun-rule border-t pt-5">
              <span className="landing-label text-white/55">{s.n}</span>
              <h3 className="t-xs mt-4">{s.h}</h3>
              <p className="t-xs mt-2 text-white/55">{s.p}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section id="figures" label="Key figures">
        <SectionLabel>Key figures</SectionLabel>
        <RevealGroup className="grid gap-x-[36px] gap-y-[72px] sm:grid-cols-2 lg:grid-cols-4">
          {數.map((d, i) => (
            <Figure key={d.n} n={d.n} t={d.t} s={d.s} i={i} 缺={d.缺} />
          ))}
        </RevealGroup>
        {/*
          紋既施,必釋之 —— 未釋之記,於讀者為無義。app 於其帶下亦有此語。
          An unexplained mark means nothing to a first-time reader. The app
          carries the same sentence under its exposure strip.
        */}
        <Reveal>
          <p className="t-xs mt-[36px] flex items-center gap-[20px] text-white/45">
            <span aria-hidden className="纹-sun inline-block h-2 w-10 shrink-0" />
            Hatched means the data does not exist. It is the one thing this tool
            will not quietly smooth over.
          </p>
        </Reveal>
      </Section>

      <Section id="does" label="What it does">
        <SectionLabel>What it does</SectionLabel>
        <div className="sun-rule border-t">
          {事.map((s) => (
            <Reveal key={s.h}>
              <div className="sun-rule grid gap-[20px] border-b py-[36px] md:grid-cols-[1fr_1.3fr]">
                <h3 className="landing-display h-lg">{s.h}</h3>
                <div>
                  <p className="t-xs text-white/55">{s.p}</p>
                  {/*
                    像在其文之下,不在其題之下 —— 題大而其側本當空,
                    此頁之疏正在於是。像既釋其文,則當附其文。
                    The glyph belongs under the paragraph it illustrates, not
                    under the heading: the air beside the display type is the
                    layout, not a hole to fill.
                  */}
                  <NetGlyph 式={s.式} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="found" label="Findings">
        <SectionLabel>What we found</SectionLabel>
        {/*
          此四者為全頁最實之語 —— 皆所自量,非所引。而前此其形最泛:
          一段文而已。今各以一界橫畫其下,隨其入而行,如畫線於其所讀之句。
          其軸既橫,則此節自別於上之三節,而不必別施一效。
          These four are the page's actual research findings, and they had the
          most generic treatment on the page. Each now draws its own rule as you
          reach it — the gesture of underlining a sentence.
        */}
        <div className="max-w-4xl">
          <RevealRule className="sun-bar h-px" />
          {所發現.map((t, i) => (
            <div key={i}>
              <Reveal>
                <p className="h-xs py-[36px]">
                  {t}
                </p>
              </Reveal>
              <RevealRule className="sun-bar h-px" />
            </div>
          ))}
        </div>
      </Section>

      <section
        aria-label="Enter"
        className="relative flex flex-col items-center justify-center overflow-hidden border-t border-white/10 px-6 py-[144px] text-center"
      >
        <ReachField />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(6,8,12,0.88)_0%,rgba(6,8,12,0.55)_42%,rgba(6,8,12,0.15)_100%)]"
        />
        <div className="relative">
          <SplitText as="h2" text="NOW WALK IT."
            className="landing-display h-3xl block" />
          <Reveal 延={0.2}>
            <div className="mt-[36px] flex flex-wrap items-center justify-center gap-[20px]">
              <Magnetic 力={0.4}>
                <button
                  type="button"
                  onClick={onEnter}
                  className="t-xs rounded-full bg-white px-10 py-4 text-black transition-[opacity,scale] duration-150 ease-quint hover:scale-[1.03] hover:opacity-90"
                >
                  Open the tool
                </button>
              </Magnetic>
              <a
                href="https://github.com/NayanVangala/nextstephacks"
                className="t-xs group inline-flex items-center gap-2 border-b border-white/30 pb-1 transition-colors duration-150 ease-quint hover:border-white"
              >
                Read the source
                <span aria-hidden className="transition-transform duration-150 ease-quint group-hover:translate-x-1">→</span>
              </a>
            </div>
          </Reveal>
          <p className="t-xs mt-[36px] hidden text-white/55 lg:block">
            Move your cursor over the network — everything that lights up is what
            you could still reach under a heat budget
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 py-[36px]">
        <div className="grid-container t-xs flex flex-wrap items-center justify-between gap-[20px] text-white/45">
          <span>NextStep Hacks 2026 · Earth Forward</span>
          <span>Seven US cities</span>
          <span>Not medical guidance</span>
        </div>
      </footer>
    </div>
  );
}
