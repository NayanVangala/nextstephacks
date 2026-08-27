import { SplitText } from "./SplitText";
import { useReveal } from "./useReveal";
import { DifferenceCursor } from "./DifferenceCursor";
import { Marquee } from "./Marquee";

/** 一Section。sticky 相疊,後者掩前者 —— Palomino 之骨也。 */
function Section({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <section
      aria-label={label}
      className={`sticky top-0 min-h-svh bg-black ${className}`}
    >
      {children}
    </section>
  );
}

/** 一數之卡。hook 必在 component 之內,不可在 map 之 callback 中呼之。 */
function FigureCard({ n, t, s: sub, i }: { n: string; t: string; s: string; i: number }) {
  const r = useReveal<HTMLDivElement>({ 位移: 100, 延: i * 90 });
  return (
    <div ref={r} className="border-t border-white/20 pt-5">
      <div className="数 text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1]">{n}</div>
      <div className="mt-2 text-lg font-medium">{t}</div>
      <div className="mt-1 text-sm text-white/50">{sub}</div>
    </div>
  );
}

/** 一發現之行。同理。 */
function FindingLine({ text, i }: { text: string; i: number }) {
  const r = useReveal<HTMLParagraphElement>({ 位移: 100, 延: i * 120 });
  return (
    <p
      ref={r}
      className="border-b border-white/20 py-7 text-[clamp(1.1rem,2.2vw,1.6rem)] font-light leading-[1.3]"
    >
      {text}
    </p>
  );
}

function Eyebrow({ children }: { children: string }) {
  const r = useReveal<HTMLParagraphElement>({ 位移: 24 });
  return (
    <p ref={r} className="mb-6 text-xs font-medium uppercase text-white/50">
      {children}
    </p>
  );
}

const 數 = [
  { n: "58%", t: "less sun exposure", s: "for a 149 m detour at 2pm in extreme heat" },
  { n: "488", t: "points cut off", s: "sidewalk that exists but a wheelchair cannot reach" },
  { n: "299", t: "transit stops", s: "with no accessibility field published at all" },
  { n: "40,165", t: "sidewalk segments", s: "modelled across Los Angeles and Seattle" },
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
  const 副 = useReveal<HTMLParagraphElement>({ 位移: 24, 延: 700 });
  const 鈕 = useReveal<HTMLDivElement>({ 位移: 24, 延: 900 });
  const 事之ref = useReveal<HTMLDivElement>({ 位移: 100 });
  const 末 = useReveal<HTMLDivElement>({ 位移: 100 });

  return (
    <div className="landing bg-black text-white">
      <DifferenceCursor />

      {/* 一、hero */}
      <Section label="Introduction" className="flex flex-col justify-center px-5">
        <div className="mx-auto w-full max-w-6xl">
          <SplitText
            as="h1"
            text="HEAT HAS"
            className="block text-[clamp(2.75rem,11vw,9.6rem)] font-semibold uppercase leading-[1]"
          />
          <SplitText
            as="div"
            text="A GEOMETRY."
            className="block text-[clamp(2.75rem,11vw,9.6rem)] font-semibold uppercase leading-[1]"
            延={260}
          />
          <p ref={副} className="mt-8 max-w-xl text-[clamp(1rem,1.6vw,1.6rem)] font-light leading-[1.2] text-white/70">
            Heat-safe, step-free walking routes for disabled pedestrians. Built on real
            sidewalk data, projected building shadows, and an explicit account of what
            the data does not know.
          </p>
          <div ref={鈕} className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase text-black transition-transform duration-300 ease-[cubic-bezier(0.3,1,0.7,1)] hover:scale-105"
            >
              Open the tool
            </button>
            <span className="text-xs uppercase text-white/40">
              Los Angeles · Seattle
            </span>
          </div>
        </div>
      </Section>

      {/* 二、Marquee */}
      <Section label="Data sources" className="flex items-center">
        <div className="w-full">
          <Marquee
            items={[
              "OpenStreetMap", "Open-Meteo", "LA Metro GTFS", "King County Metro",
              "Sanity-free", "Client-side A*", "Projected shadows", "Works offline",
            ]}
          />
        </div>
      </Section>

      {/* 三、數 */}
      <Section label="Key figures" className="flex flex-col justify-center px-5 py-[clamp(20px,8svh,100px)]">
        <div className="mx-auto w-full max-w-6xl">
          <Eyebrow>Key figures</Eyebrow>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {數.map((d, i) => (
              <FigureCard key={d.n} n={d.n} t={d.t} s={d.s} i={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* 四、三事 */}
      <Section label="What it does" className="flex flex-col justify-center px-5 py-[clamp(20px,8svh,100px)]">
        <div ref={事之ref} className="mx-auto w-full max-w-6xl">
          <Eyebrow>What it does</Eyebrow>
          <div className="divide-y divide-white/20 border-y border-white/20">
            {事.map((s) => (
              <div key={s.h} className="grid gap-4 py-8 md:grid-cols-[4rem_1fr_1.2fr]">
                <span className="数 text-2xl font-semibold text-white/40">{s.i}</span>
                <h2 className="text-[clamp(1.6rem,3.6vw,2.4rem)] font-semibold uppercase leading-[1.2]">
                  {s.h}
                </h2>
                <p className="text-base font-light leading-[1.4] text-white/60">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 五、所發現者 */}
      <Section label="Findings" className="flex flex-col justify-center px-5 py-[clamp(20px,8svh,100px)]">
        <div className="mx-auto w-full max-w-4xl">
          <Eyebrow>What we found</Eyebrow>
          {[
            "LA Metro's public feeds omit the GTFS wheelchair_boarding field entirely — not blank, absent — across all 299 stops in the study area.",
            "Its canceled-service endpoint answers 200, with open CORS and well-formed JSON. The data is from October 2022.",
            "Phoenix publishes building heights for 6% of downtown. We measured it, and refused to ship it.",
          ].map((t, i) => (
            <FindingLine key={i} text={t} i={i} />
          ))}
        </div>
      </Section>

      {/* 六、末 */}
      <Section label="Enter" className="flex flex-col items-center justify-center px-5 text-center">
        <div ref={末}>
          <SplitText
            as="h2"
            text="NOW WALK IT."
            className="block text-[clamp(2.5rem,10vw,8rem)] font-semibold uppercase leading-[1]"
          />
          <button
            type="button"
            onClick={onEnter}
            className="mt-10 rounded-full bg-white px-9 py-4 text-sm font-semibold uppercase text-black transition-transform duration-300 ease-[cubic-bezier(0.3,1,0.7,1)] hover:scale-105"
          >
            Open the tool
          </button>
          <p className="mt-8 text-xs uppercase text-white/40">
            NextStep Hacks 2026 · Earth Forward
          </p>
        </div>
      </Section>
    </div>
  );
}
