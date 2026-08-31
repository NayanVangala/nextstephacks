import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { 曝之rgb } from "./useNet";
import { 時, 靜之位, 地, 寬, 樓, 格數, 日之向, 日之位, 影, 蔭之格 } from "./日之算";

/**
 * 影之所以出。日行其弧,樓投其影,人行道乃分為蔭與曝 —— 此器之根也。
 *
 * The page asserts that sun exposure is "modelled from building shadows
 * projected against the sun's real position" and then shows nothing. This is
 * that sentence, drawn: the sun walks the eight hours the dataset actually
 * holds, each building projects its top corners onto the pavement, and the
 * pavement is coloured by the same shade/sun ramp the map and the legend use.
 *
 * ── 此塊為擬,非實 ──────────────────────────────────────────────────
 * IMPORTANT: the block itself is illustrative — three invented buildings, not
 * measured footprints. The caption says so. Everything else on this page draws
 * real data, so an unlabelled diagram that merely looks like data would be the
 * one dishonest thing in it. The hours are real (06:00–20:00, the eight the
 * dataset stores) and the projection is real trigonometry.
 *
 * SVG,非 canvas —— 其形寡而其文在其中,SVG 則其字隨其屏而清,且不待一 rAF。
 * SVG rather than canvas: few shapes, live text inside, and nothing that needs
 * a frame to appear.
 */

function 色(曝: number, a = 1) {
  const [r, g, b] = 曝之rgb(曝);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * 窄屏則取其中而近之。
 *
 * 全框一二〇〇比四〇〇,於三七五之屏則其高一〇五像素而已 —— 樓如線,
 * 日如點,是為一帶,非為一圖。故窄則裁其框,取其中六六〇,其高不改,
 * 則其比自一比三而為一比一點七,其高倍之。
 * At 375px the full 3:1 frame renders 105px tall: the buildings become strokes
 * and the sun a 4px dot. Cropping to the middle of the same drawing — rather
 * than shrinking all of it — nearly doubles the height at the same width.
 */
function useNarrow(): boolean {
  const [窄, set窄] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const m = matchMedia("(max-width: 640px)");
    const 聽 = () => set窄(m.matches);
    聽();
    m.addEventListener("change", 聽);
    return () => m.removeEventListener("change", 聽);
  }, []);
  return 窄;
}

export function SunDial() {
  const 減 = useReducedMotion();
  const 窄 = useNarrow();
  const [位, set位] = useState(減 ? 靜之位 : 0);
  const [手, set手] = useState(false);
  const 盒 = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // 減動者不行。手既加之,則日從其手,不復自行 —— 同 hero。
    if (減 || 手) return;
    const id = setInterval(() => set位((i) => (i + 1) % 時.length), 1700);
    return () => clearInterval(id);
  }, [減, 手]);

  const [sx, sy] = 日之位(位);
  const 諸影 = 樓.map((b) => 影(b, 位));
  const 格 = 蔭之格(位);
  const 蔭比 = Math.round((格.filter(Boolean).length / 格數) * 100);

  const 掃 = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = 盒.current?.getBoundingClientRect();
    // 粗指者不奪 —— 觸屏之上,「移」即「捲」。
    if (!r || 減 || e.pointerType !== "mouse") return;
    set手(true);
    const t = Math.max(0, Math.min(0.999, (e.clientX - r.left) / r.width));
    set位(Math.floor(t * 時.length));
  };

  return (
    <figure className="mt-[36px]">
      <svg
        ref={盒}
        viewBox={窄 ? "300 10 660 390" : `0 0 ${寬} 400`}
        aria-hidden
        onPointerMove={掃}
        onPointerLeave={() => set手(false)}
        className="sun-rule w-full rounded-lg border bg-white/[0.02]"
      >
        {/*
          日之射。皆平行 —— 日遠而其光不散,此其所以然。
          Parallel by construction: each ray runs through the top corner that
          casts the tip, in the sun's own direction. Rays that converged on the
          drawn sun would be drawing a street lamp.
        */}
        {樓.map((b, i) => {
          const [g1, g2] = 諸影[i];
          const { α, 側, 影向 } = 日之向(位);
          const 尖 = 影向 > 0 ? g2 : g1;
          const 角x = 影向 > 0 ? b.x + b.w : b.x;
          const 角y = 地 - b.h;
          return (
            <line
              key={i}
              x1={角x + 側 * Math.cos(α) * 170}
              y1={角y - Math.sin(α) * 170}
              x2={尖}
              y2={地}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          );
        })}

        {/* 日。 */}
        <circle cx={sx} cy={sy} r={26} fill="rgba(255,107,91,0.10)" />
        <circle cx={sx} cy={sy} r={13} fill={色(1)} />

        {/* 樓。其面暗於其地,故為體而非為框。 */}
        {樓.map((b, i) => (
          <rect
            key={i}
            x={b.x} y={地 - b.h} width={b.w} height={b.h}
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1}
          />
        ))}

        {/* 人行道。一格一段,蔭則青,曝則赤 —— 與圖與籤同其階。 */}
        {格.map((蔭, i) => (
          <rect
            key={i}
            x={(i / 格數) * 寬 + 1}
            y={地 + 4}
            width={寬 / 格數 - 2}
            height={14}
            fill={色(蔭 ? 0 : 1, 蔭 ? 0.85 : 0.9)}
          />
        ))}
      </svg>

      {/*
        時與其比,以文為之,不在其 svg 之中 —— svg 之字隨其框而縮,
        於三七五之屏則七像素而已,不可讀。且文在其外,則讀屏者亦得之。
        The readout was <text> inside the viewBox, which scales with the
        drawing: 22px at 1440 became ~7px on a 375px phone. As HTML it stays at
        its real size, and it stops being hidden behind the aria-hidden diagram.
      */}
      <p className="landing-label mt-4 flex items-baseline justify-between gap-4 text-white/80">
        <span>{String(時[位]).padStart(2, "0")}:00</span>
        <span className="text-white/55">{蔭比}% of this block in shade</span>
      </p>
      <figcaption className="t-4xs mt-3 text-white/50">
        How exposure is modelled: building heights projected against the sun's
        position at each of the eight hours the dataset stores. This block is
        illustrative — the map uses real OpenStreetMap footprints and heights,
        where a city publishes them.
      </figcaption>
    </figure>
  );
}
