import { SplitText } from "./SplitText";
import { DifferenceCursor } from "./DifferenceCursor";
import { Marquee } from "./Marquee";
import { Nav } from "./Nav";
import { HeatField } from "./HeatField";
import { ReachField } from "./ReachField";
import { ScrollThread } from "./ScrollThread";
import { useCountUp, 解數 } from "./useCountUp";
import { Reveal, RevealGroup, RevealItem } from "./motion";

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
      className={`landing-sec scroll-mt-16 border-t border-white/10 px-5 ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** 節之標:十六而輕。前此十二而重,故其標壓於其文;今則讓之。 */
function SectionLabel({ children }: { children: string }) {
  return (
    <Reveal>
      <p className="landing-label mb-10 flex items-center gap-[20px] text-white/50">
        <span aria-hidden className="inline-block h-px w-10 bg-white/30" />
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
function Figure({ n, t, s: sub, i }: { n: string; t: string; s: string; i: number }) {
  return (
    <RevealItem className="border-t border-white/20 pt-5">
      <div className="数 landing-display text-[clamp(3rem,7vw,5.5rem)]">
        <CountUpFigure n={n} 延={i * 0.08 + 0.15} />
      </div>
      <div className="mt-4 text-base">{t}</div>
      <div className="mt-1 text-base text-white/50">{sub}</div>
    </RevealItem>
  );
}

const 數 = [
  { n: "136k", t: "sidewalk segments", s: "modelled across seven US downtowns" },
  { n: "484", t: "census block groups", s: "scored for step-free connectivity" },
  { n: "91%", t: "of Phoenix buildings", s: "have no published height at all" },
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
const 事 = [
  { h: "ROUTE",
    p: "Every routing app optimises for shortest. A handful optimise for shade. None optimise for both at once, and the step-free path is usually the longer, more exposed one." },
  { h: "REACH",
    p: "Not where you want to go, but where you can actually get. Run the graph to exhaustion under a heat budget and ask whether any cooling centre falls inside it." },
  { h: "REPORT",
    p: "98.9% of the network is traversable, which sounds close to solved. It is the wrong number. 488 points of usable sidewalk cannot be reached at all." },
];

const 所發現 = [
  "LA Metro's public feeds omit the GTFS wheelchair_boarding field entirely — not blank, absent — across all 299 stops in the study area.",
  "Its canceled-service endpoint answers 200, with open CORS and well-formed JSON. The data is from October 2022.",
  "Phoenix publishes building heights for 9% of downtown. It is the hottest city here and has the worst shade data by a wide margin.",
  "We looked for a link between shade and household income. Across 484 block groups we could not find one that survives the margins of error, and the tool says so.",
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing bg-black text-white">
      <DifferenceCursor />
      <Nav onEnter={onEnter} />
      <ScrollThread 節數={4} />

      <section
        id="top"
        aria-label="Introduction"
        className="relative flex min-h-svh flex-col justify-center overflow-hidden px-5 pt-24"
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
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(6,8,12,0.92)_0%,rgba(6,8,12,0.88)_30%,rgba(6,8,12,0.55)_52%,rgba(6,8,12,0.10)_78%,rgba(6,8,12,0)_100%)]"
        />
        <div className="relative mx-auto w-full max-w-6xl">
          <SplitText as="h1" text="HEAT HAS"
            className="landing-display block text-[clamp(3rem,12vw,10.8rem)]" />
          <SplitText as="div" text="A GEOMETRY." 延={240}
            className="landing-display block pl-[8vw] text-[clamp(3rem,12vw,10.8rem)]" />

          <Reveal 延={0.5}>
            <p className="mt-[36px] max-w-2xl text-base text-white/70">
              Heat-safe, step-free walking routes for disabled pedestrians. Built
              on real sidewalk data, projected building shadows, and an explicit
              account of what the data does not know.
            </p>
          </Reveal>

          <Reveal 延={0.65}>
            <div className="mt-[36px] flex flex-wrap items-center gap-[20px]">
              <button
                type="button"
                onClick={onEnter}
                className="rounded-full bg-white px-8 py-4 text-base text-black transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] hover:opacity-90"
              >
                Open the tool
              </button>
              <a
                href="#what"
                className="group inline-flex items-center gap-2 border-b border-white/30 pb-1 text-base transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white"
              >
                How it works
                <span aria-hidden className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-y-1">↓</span>
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
          <h2 className="landing-display max-w-4xl text-[clamp(1.75rem,4.2vw,3.4rem)]">
            A routing tool that treats heat and step-free access as the same
            problem, because for a lot of people they are.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <p className="mt-[36px] max-w-2xl text-base text-white/60">
            Passable models every sidewalk segment in seven downtowns for whether
            you can physically use it and how much sun falls on it, hour by hour.
            It runs entirely in your browser — no account, no server, no tracking —
            and it says plainly when the underlying data does not know something.
          </p>
        </Reveal>
        <RevealGroup className="mt-[72px] grid gap-[36px] md:grid-cols-3">
          {何以為之.map((s) => (
            <RevealItem key={s.n} className="border-t border-white/20 pt-5">
              <span className="数 text-base text-white/40">{s.n}</span>
              <h3 className="mt-4 text-base">{s.h}</h3>
              <p className="mt-2 text-base text-white/55">{s.p}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section id="figures" label="Key figures">
        <SectionLabel>Key figures</SectionLabel>
        <RevealGroup className="grid gap-x-[36px] gap-y-[72px] sm:grid-cols-2 lg:grid-cols-4">
          {數.map((d, i) => (
            <Figure key={d.n} n={d.n} t={d.t} s={d.s} i={i} />
          ))}
        </RevealGroup>
      </Section>

      <Section id="does" label="What it does">
        <SectionLabel>What it does</SectionLabel>
        <div className="border-t border-white/20">
          {事.map((s) => (
            <Reveal key={s.h}>
              <div className="grid gap-[20px] border-b border-white/20 py-[36px] md:grid-cols-[1fr_1.3fr]">
                <h3 className="landing-display text-[clamp(1.6rem,3.4vw,2.6rem)]">{s.h}</h3>
                <p className="text-base text-white/55">{s.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="found" label="Findings">
        <SectionLabel>What we found</SectionLabel>
        <div className="max-w-4xl border-t border-white/20">
          {所發現.map((t, i) => (
            <Reveal key={i}>
              <p className="border-b border-white/20 py-[36px] text-[clamp(1.05rem,1.9vw,1.5rem)] font-light leading-[1.2]">
                {t}
              </p>
            </Reveal>
          ))}
        </div>
      </Section>

      <section
        aria-label="Enter"
        className="relative flex flex-col items-center justify-center overflow-hidden border-t border-white/10 px-5 py-[144px] text-center"
      >
        <ReachField />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.55)_42%,rgba(0,0,0,0.15)_100%)]"
        />
        <div className="relative">
          <SplitText as="h2" text="NOW WALK IT."
            className="landing-display block text-[clamp(2.75rem,11vw,9rem)]" />
          <Reveal 延={0.2}>
            <div className="mt-[36px] flex flex-wrap items-center justify-center gap-[20px]">
              <button
                type="button"
                onClick={onEnter}
                className="rounded-full bg-white px-10 py-4 text-base text-black transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] hover:opacity-90"
              >
                Open the tool
              </button>
              <a
                href="https://github.com/NayanVangala/nextstephacks"
                className="group inline-flex items-center gap-2 border-b border-white/30 pb-1 text-base transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white"
              >
                Read the source
                <span aria-hidden className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-x-1">→</span>
              </a>
            </div>
          </Reveal>
          <p className="mt-[36px] hidden text-base text-white/40 lg:block">
            Move your cursor over the network — everything that lights up is what
            you could still reach under a heat budget
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-[36px]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-[20px] text-base text-white/45">
          <span>NextStep Hacks 2026 · Earth Forward</span>
          <span>Seven US cities</span>
          <span>Not medical guidance</span>
        </div>
      </footer>
    </div>
  );
}
