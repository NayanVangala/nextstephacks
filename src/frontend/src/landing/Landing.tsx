import { SplitText } from "./SplitText";
import { useReveal } from "./useReveal";
import { DifferenceCursor } from "./DifferenceCursor";
import { Marquee } from "./Marquee";
import { Nav } from "./Nav";
import { HeatField } from "./HeatField";
import { ReachField } from "./ReachField";
import { ScrollThread } from "./ScrollThread";
import { useCountUp, 解數 } from "./useCountUp";

/**
 * 一Section。
 *
 * NOT min-h-svh any more. Every section was a full viewport tall with its
 * content vertically centred, which on a 4,320px page left roughly 40% of it
 * empty black — the hero ended at 280px and nothing happened until 500px.
 * Sections are now sized by their content with a deliberate rhythm, so scrolling
 * moves through material instead of through gaps.
 */
function Section({
  children,
  id,
  className = "",
  label,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  label: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={`scroll-mt-16 border-t border-white/10 px-5 py-[clamp(56px,9svh,112px)] ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** 節之標。一點一文 —— 全頁一貫,其所法者亦如是。 */
function 節標({ children }: { children: string }) {
  const r = useReveal<HTMLParagraphElement>({ 位移: 20 });
  return (
    <p ref={r} className="mb-8 flex items-center gap-2 text-xs uppercase tracking-wide text-white/55">
      <span aria-hidden className="inline-block size-1.5 rounded-full bg-white/70" />
      {children}
    </p>
  );
}

/** 一數之卡。有框有號 —— 前但一橫線,故其列如表而不如卡。 */
function 升數({ n, 延 }: { n: string; 延: number }) {
  const 解 = 解數(n);
  const { ref, 值 } = useCountUp(解?.數 ?? 0, { 延 });
  if (!解) return <>{n}</>;
  // 小數者存其一位(58%),大數者取其整而分之(40,165)。
  const 文 = 解.數 < 100
    ? 值.toFixed(0)
    : Math.round(值).toLocaleString();
  return (
    <span ref={ref}>
      {解.前}{文}{解.後}
    </span>
  );
}

function FigureCard({ n, t, s: sub, i }: { n: string; t: string; s: string; i: number }) {
  const r = useReveal<HTMLDivElement>({ 位移: 60, 延: i * 80 });
  return (
    <div
      ref={r}
      className="group relative overflow-hidden rounded-xl border border-white/15 p-6 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white/35"
    >
      {/* 懸則一暈自其角而起。transform 與 opacity 而已,不觸 layout。 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-32 rounded-full bg-white/5 opacity-0 transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100"
      />
      <span className="数 absolute right-5 top-5 text-xs text-white/35">
        {String(i + 1).padStart(2, "0")}
      </span>
      <div className="数 text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1]">
        <升數 n={n} 延={i * 80 + 120} />
      </div>
      <div className="mt-2 text-base font-medium">{t}</div>
      <div className="mt-1 text-sm leading-[1.4] text-white/55">{sub}</div>
    </div>
  );
}

function FindingLine({ text, i }: { text: string; i: number }) {
  const r = useReveal<HTMLParagraphElement>({ 位移: 60, 延: i * 100 });
  return (
    <p
      ref={r}
      className="border-b border-white/15 py-6 text-[clamp(1.05rem,2vw,1.5rem)] font-light leading-[1.35]"
    >
      {text}
    </p>
  );
}

/** 一步之解。此頁前此不言其物之為何,故立此節。 */
function 一步({ n, h, p, i }: { n: string; h: string; p: string; i: number }) {
  const r = useReveal<HTMLDivElement>({ 位移: 60, 延: i * 90 });
  return (
    <div ref={r} className="rounded-xl border border-white/15 p-6">
      <span className="数 text-xs text-white/35">{n}</span>
      <h3 className="mt-3 text-lg font-semibold">{h}</h3>
      <p className="mt-2 text-sm leading-[1.5] text-white/60">{p}</p>
    </div>
  );
}

const 數 = [
  { n: "58%", t: "less sun exposure", s: "for a 149 m detour at 2pm in extreme heat" },
  { n: "488", t: "points cut off", s: "sidewalk that exists but a wheelchair cannot reach" },
  { n: "299", t: "transit stops", s: "with no accessibility field published at all" },
  { n: "54k", t: "sidewalk segments", s: "modelled across Los Angeles, Seattle and Phoenix" },
];

const 何以為之 = [
  {
    n: "01",
    h: "Tell it who you are",
    p: "Wheelchair user, heat-sensitive, blind or low vision. The profile changes which sidewalk counts as passable at all, not just how it is ranked.",
  },
  {
    n: "02",
    h: "Pick two points, and an hour",
    p: "Sun exposure is modelled for every segment at eight times of day, from projected building shadows against the sun's real position.",
  },
  {
    n: "03",
    h: "Walk it, or find out why you cannot",
    p: "You get a route and a written itinerary. When no route exists it names the barrier instead of shrugging — three flights of steps, 60 m of them.",
  },
];

const 事 = [
  {
    i: "1.",
    h: "ROUTE",
    p: "Every routing app optimises for shortest. A handful optimise for shade. None optimise for both at once — and the step-free path is usually the longer, more exposed one.",
  },
  {
    i: "2.",
    h: "REACH",
    p: "Not where you want to go, but where you can actually get. Run the graph to exhaustion under a heat budget and ask whether any cooling centre falls inside it.",
  },
  {
    i: "3.",
    h: "REPORT",
    p: "98.9% of the network is traversable, which sounds close to solved. It is the wrong number. 488 points of usable sidewalk cannot be reached at all.",
  },
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  const 副 = useReveal<HTMLParagraphElement>({ 位移: 24, 延: 600 });
  const 鈕 = useReveal<HTMLDivElement>({ 位移: 24, 延: 780 });
  const 末 = useReveal<HTMLDivElement>({ 位移: 60 });

  return (
    <div className="landing bg-black text-white">
      <DifferenceCursor />
      <Nav onEnter={onEnter} />
      <ScrollThread 節數={4} />

      {/* 一、hero。次行縮入,則其題斜行而下 —— 二行齊左則平。 */}
      <section
        id="top"
        aria-label="Introduction"
        className="relative flex min-h-svh flex-col justify-center overflow-hidden px-5 pt-24"
      >
        {/* 真實之洛城人行道。鼠橫移則時辰隨之,其網自蔭而赤。 */}
        <HeatField />
        {/* 網之上覆一暈,俾其字可讀 —— 圖為底,非為主。 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.86)_32%,rgba(0,0,0,0.45)_62%,rgba(0,0,0,0.12)_100%)]"
        />
        <div className="relative mx-auto w-full max-w-6xl">
          <SplitText
            as="h1"
            text="HEAT HAS"
            className="block text-[clamp(2.75rem,11vw,9.6rem)] font-semibold uppercase leading-[1]"
          />
          <SplitText
            as="div"
            text="A GEOMETRY."
            className="block pl-[8vw] text-[clamp(2.75rem,11vw,9.6rem)] font-semibold uppercase leading-[1]"
            延={240}
          />
          <p
            ref={副}
            className="mt-10 max-w-xl text-[clamp(1rem,1.5vw,1.4rem)] font-light leading-[1.35] text-white/70"
          >
            Heat-safe, step-free walking routes for disabled pedestrians. Built on
            real sidewalk data, projected building shadows, and an explicit account
            of what the data does not know.
          </p>
          <div ref={鈕} className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase text-black transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:opacity-90"
            >
              Open the tool
            </button>
            <a
              href="#what"
              className="group inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold uppercase transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white/60"
            >
              How it works
              <span
                aria-hidden
                className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-x-1"
              >
                →
              </span>
            </a>
            <span className="text-xs uppercase text-white/55">
              Los Angeles · Seattle · Phoenix
            </span>
          </div>
          {/* 動之提示。無此則其效多不為人所見 —— 掃之而後知。 */}
          <p className="mt-8 hidden text-xs uppercase tracking-wide text-white/45 lg:block">
            Sweep across to move the sun — real Los Angeles sidewalk, 6am to 8pm
          </p>
        </div>
      </section>

      {/* 二、資之所自 */}
      <div className="border-t border-white/10 py-6">
        <Marquee
          items={[
            "OpenStreetMap", "Open-Meteo", "LA Metro GTFS", "King County Metro",
            "US Census TIGER", "ACS 5-year", "Client-side A*", "Projected shadows",
            "Works offline",
          ]}
        />
      </div>

      {/* 三、此物為何。前此全頁不明言之,人須捲千像素而後知。 */}
      <Section id="what" label="What it is">
        <節標>What it is</節標>
        <h2 className="max-w-3xl text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.15]">
          A routing tool that treats heat and step-free access as the same problem,
          because for a lot of people they are.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-[1.6] text-white/65">
          Passable models every sidewalk segment in three downtowns for whether you
          can physically use it and how much sun falls on it, hour by hour. It runs
          entirely in your browser — no account, no server, no tracking — and it
          says plainly when the underlying data does not know something.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {何以為之.map((s, i) => (
            <一步 key={s.n} n={s.n} h={s.h} p={s.p} i={i} />
          ))}
        </div>
      </Section>

      {/* 四、數 */}
      <Section id="figures" label="Key figures">
        <節標>Key figures</節標>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {數.map((d, i) => (
            <FigureCard key={d.n} n={d.n} t={d.t} s={d.s} i={i} />
          ))}
        </div>
      </Section>

      {/* 五、三事 */}
      <Section id="does" label="What it does">
        <節標>What it does</節標>
        <div className="divide-y divide-white/15 border-y border-white/15">
          {事.map((s) => (
            <div key={s.h} className="grid gap-4 py-7 md:grid-cols-[3.5rem_1fr_1.2fr]">
              <span className="数 text-xl font-semibold text-white/35">{s.i}</span>
              <h3 className="text-[clamp(1.5rem,3vw,2.1rem)] font-semibold uppercase leading-[1.15]">
                {s.h}
              </h3>
              <p className="text-sm leading-[1.5] text-white/60">{s.p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 六、所發現者 */}
      <Section id="found" label="Findings">
        <節標>What we found</節標>
        <div className="max-w-4xl">
          {[
            "LA Metro's public feeds omit the GTFS wheelchair_boarding field entirely — not blank, absent — across all 299 stops in the study area.",
            "Its canceled-service endpoint answers 200, with open CORS and well-formed JSON. The data is from October 2022.",
            "Phoenix publishes building heights for 9% of downtown. We shipped it anyway, with the uncertainty on the surface.",
            "We looked for a link between shade and household income. Across 145 block groups we could not find one that survives the margins of error, and the tool says so.",
          ].map((t, i) => (
            <FindingLine key={i} text={t} i={i} />
          ))}
        </div>
      </Section>

      {/* 七、末 */}
      <section
        aria-label="Enter"
        className="relative flex flex-col items-center justify-center overflow-hidden border-t border-white/10 px-5 py-[clamp(96px,18svh,200px)] text-center"
      >
        {/* Reach 之算,可玩者。鼠所在,則所及者明。 */}
        <ReachField />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.55)_42%,rgba(0,0,0,0.15)_100%)]"
        />
        <div className="relative" ref={末}>
          <SplitText
            as="h2"
            text="NOW WALK IT."
            className="block text-[clamp(2.5rem,10vw,8rem)] font-semibold uppercase leading-[1]"
          />
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-full bg-white px-9 py-4 text-sm font-semibold uppercase text-black transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:opacity-90"
            >
              Open the tool
            </button>
            <a
              href="https://github.com/NayanVangala/nextstephacks"
              className="group inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-4 text-sm font-semibold uppercase transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-white/60"
            >
              Read the source
              <span
                aria-hidden
                className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </div>
          <p className="mt-8 hidden text-xs uppercase tracking-wide text-white/45 lg:block">
            Move your cursor over the network — everything that lights up is what
            you could still reach under a heat budget
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-wide text-white/55">
          <span>NextStep Hacks 2026 · Earth Forward</span>
          <span>Los Angeles · Seattle · Phoenix</span>
          <span>Not medical guidance</span>
        </div>
      </footer>
    </div>
  );
}
