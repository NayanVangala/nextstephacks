import { useRef } from "react";
import { SplitText } from "./SplitText";
import { ReachProbe } from "./ReachProbe";
import { DifferenceCursor } from "./DifferenceCursor";
import { Marquee } from "./Marquee";
import { Nav } from "./Nav";
import { HeatField } from "./HeatField";
import { ScrollThread } from "./ScrollThread";
import { useCountUp, 解數 } from "./useCountUp";
import { Reveal, RevealGroup, RevealItem, RevealRule } from "../motion/reveal";
import { useSunScroll } from "./useSunScroll";
import { useSmoothScroll } from "./useSmoothScroll";
import { Magnetic } from "./Magnetic";
import { SunDial } from "./SunDial";
import { NetGlyph, type 式 } from "./NetGlyph";
import { CITIES } from "../data/cities";

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
      {/*
        缺者,其數亦錯出一線 —— 紋在其上,錯在其數,一義而二道。
        紋者賴其形,錯者賴其位;色盲者得其一,而不能辨紋於小屏者得其二。
        The hatch above already marks this figure as a gap; the misregistration
        on the numeral itself carries the same fact through a second channel.
        One reader gets it from the texture, another from the offset — neither
        depends on telling the three inks apart.
      */}
      <div className={`数 landing-display h-2xl mt-5 ${缺 ? "失準" : ""}`}>
        <CountUpFigure n={n} 延={i * 0.08 + 0.15} />
      </div>
      <div className="t-xs mt-4">{t}</div>
      <div className="t-xs mt-1 text-ink/70">{sub}</div>
    </RevealItem>
  );
}

const 數: { n: string; t: string; s: string; 缺?: boolean }[] = [
  { n: "478k", t: "sidewalk segments", s: "modelled across thirty-eight US downtowns" },
  { n: "1,288", t: "neighborhoods scored", s: "for whether their step-free sidewalk connects" },
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
    p: "Every routing app optimizes for shortest. A handful optimize for shade. None optimize for both at once, and the step-free path is usually the longer, more exposed one. You get a line on the map and the same walk written out as directions — printable, and shareable as a link that opens exactly what you saw." },
  { h: "REACH", 式: "reach",
    p: "Not where you want to go, but where you can actually get. Tell it how much sun you can take today and it draws the edge of your range — then says whether a cooling center is inside it." },
  { h: "REPORT", 式: "report",
    p: "99.1% of the network is traversable, which sounds close to solved. It is the wrong number. Thirty-six neighborhoods across sixteen cities are 100% step-free and 0% connected — every meter passes, none of it reaches the city." },
];

const 所發現 = [
  "LA Metro's public feeds omit the GTFS wheelchair_boarding field entirely — not blank, absent — across all 299 stops in the study area.",
  "Its canceled-service endpoint answers 200, with open CORS and well-formed JSON. The data is from October 2022.",
  "Phoenix publishes building heights for 9% of its downtown. Green Bay publishes them for 2%. The two cities have almost nothing else in common, and neither has anything to do with how much either one needs the shade.",
  "Chicago's sidewalk network is 97.7% traversable for a wheelchair user. It also strands 1,948 connected points — 9.2% of its walkable graph — behind short flights of steps. Both numbers are true. Only one of them is about whether you can get anywhere.",
  "We joined median household income to the 1,288 neighborhoods and got a figure back for 1,101 of them. Only eighteen cities have income estimates precise enough to test against shade, and across those eighteen the sign will not hold still: +0.51 in Miami, −0.34 in Boston, +0.03 in Los Angeles. A downtown extract cannot answer this question, and every city page says so.",
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
    <div ref={頁} className="landing text-ink">
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
          幕既為紙,非為墨 —— 世界既倒,此值亦當倒,不然則紙上覆一黑霧。
          The scrim is paper-toned now, not ink-toned: with the ground inverted,
          a 9,12,19 wash over a cream sheet reads as a bruise. Same purpose,
          same falloff, opposite end of the ramp.
          The scrim clears completely on the right instead of holding 12%
          black across the whole hero. It exists to keep the headline legible,
          not to dim the thing the headline is about.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(242,237,225,0.92)_0%,rgba(242,237,225,0.78)_28%,rgba(242,237,225,0.38)_50%,rgba(242,237,225,0.05)_76%,rgba(242,237,225,0)_100%)] dark:bg-none"
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
            <p className="t-xs mt-[36px] max-w-2xl text-ink/85 [text-shadow:0_1px_12px_rgba(9,12,19,0.95)]">
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
                  className="t-xs 切纸 切纸-墨 bg-ink px-8 py-4 text-canvas"
                >
                  Open the tool
                </button>
              </Magnetic>
              <a
                href="#what"
                className="t-xs group inline-flex items-center gap-2 border-b border-ink/30 pb-1 transition-colors duration-150 ease-quint hover:border-ink"
              >
                How it works
                <span aria-hidden className="transition-transform duration-150 ease-quint group-hover:translate-y-1">↓</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="border-t border-ink/10 py-[20px]">
        {/*
          此列為所取之源,故其中不可有無所本者。去其二:
          「Works offline」—— 無 service worker,無 PWA,其囊每載必取諸網,離網則全不見。
          「King County Metro」—— 但為 bel 與 sea 之 paratransit 之名,未嘗取其 GTFS;
            十六城之中,有公交之站者惟洛城一城而已。
          Two removed as unsupported: there is no service worker or PWA config
          anywhere, so the app renders nothing offline; and King County Metro
          appears only as a paratransit operator name — no GTFS feed is fetched
          for it, and only LA has any transit stops at all.
        */}
        {/*
          此帶前此列其源(「US Census TIGER」「Client-side A*」之類)——
          是為判者而書之憑,非為居者而答之問。
          而居者至此,其第一問曰:吾邑在否?三十八城之名,前此惟見於問答之第五。
          源已詳列於 about 一頁,各系其說,故此處讓之於城。
          This band listed data sources — a credential list for judges, not an
          answer for a resident, whose first question is "is my city in this?".
          The 38 names appeared in exactly one Q&A answer. The sources are
          itemised with descriptions on the About page, so the band goes to the
          cities.
        */}
        <Marquee items={CITIES.map((c) => c.label)} />
      </div>

      <Section id="what" label="What it is">
        <Reveal>
          <h2 className="landing-display h-lg max-w-4xl">
            A routing tool that treats heat and step-free access as the same
            problem, because for a lot of people they are.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <p className="t-xs mt-[36px] max-w-2xl text-ink/72">
            Passable models every sidewalk segment in thirty-eight downtowns for whether
            you can physically use it and how much sun falls on it, hour by hour.
            It runs in your browser — no account, nowhere for us to store anything,
            and no tracking — and it says plainly when the underlying data does not
            know something.
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
              {/*
                其序入於題中,不復自為一行。
                前此為一 span 懸於 h3 之上 —— 是眉也,craft floor 所斷禁者;
                且其序與其眉同為一物,故一改而二病俱去。序自有其用(此三者
                真有先後),故不去其序,但不使之自立為一行。
                The number was a label span sitting directly above the h3 —
                an eyebrow, which the floor bans outright. The sequence is real
                (these three genuinely are steps), so the number stays; it just
                stops being its own line above the heading.
              */}
              <h3 className="t-xs flex gap-3">
                <span aria-hidden className="数 shrink-0 text-ink/55">{s.n}</span>
                <span>{s.h}</span>
              </h3>
              <p className="t-xs mt-2 text-ink/70">{s.p}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section id="figures" label="Key figures">
        <Reveal>
          <h2 className="landing-display h-lg mb-[56px] max-w-3xl">
            Thirty-eight downtowns, measured one segment at a time.
          </h2>
        </Reveal>
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
          <p className="t-xs mt-[36px] flex items-center gap-[20px] text-ink/70">
            <span aria-hidden className="纹-sun inline-block h-2 w-10 shrink-0" />
            Hatched means the data does not exist. It is the one thing this tool
            will not quietly smooth over.
          </p>
        </Reveal>
      </Section>

      <Section id="does" label="What it does">
        <div className="sun-rule border-t">
          {事.map((s) => (
            <Reveal key={s.h}>
              <div className="sun-rule grid gap-[20px] border-b py-[36px] md:grid-cols-[1fr_1.3fr]">
                <h3 className="landing-display h-lg">{s.h}</h3>
                <div>
                  <p className="t-xs text-ink/70">{s.p}</p>
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
        <Reveal>
          <h2 className="landing-display h-lg mb-[56px] max-w-3xl">
            Most of what we found was about the data, not the sidewalk.
          </h2>
        </Reveal>
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

      <ReachProbe onEnter={onEnter} />

      <footer className="border-t border-ink/10 py-[36px]">
        {/*
          說之頁在此。前此全頁無一鏈出於其外 —— 讀至其末而有疑者,無所往。
          The four explanation pages are reachable from the nav at 1024px and up;
          the footer is where anyone below that width, or anyone who has read to
          the end still unsure, actually finds them.
        */}
        <nav aria-label="More about Passable" className="grid-container">
          <ul className="t-xs flex flex-wrap gap-x-[36px] gap-y-[20px]">
            {[
              ["#/help", "How to use it"],
              ["#/questions", "Questions and answers"],
              ["#/about", "Who it's for"],
              ["#/limits", "What we don't know"],
            ].map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="border-b border-ink/25 pb-1 transition-colors duration-150 ease-quint hover:border-ink"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid-container t-xs mt-[36px] flex flex-wrap items-center justify-between gap-[20px] text-ink/70">
          <span>NextStep Hacks 2026 · Earth Forward</span>
          <span>Thirty-eight US downtowns</span>
          <span>Not medical guidance</span>
        </div>
      </footer>
    </div>
  );
}
