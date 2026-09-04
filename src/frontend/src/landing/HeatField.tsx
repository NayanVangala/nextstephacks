import { useEffect, useRef } from "react";
import { useNet, 曝之rgb } from "./useNet";

/**
 * hero 之器:真實之洛城人行道,日行其上,而其網隨之自青而赤。
 *
 * ── 何以改之 ─────────────────────────────────────────────────────────
 * 此物本已具,而為壁紙:置於幕下(黑之九四至一二),透七成,又待鼠而後動。
 * 故人至此頁,所見者一靜像耳 —— 而全器之旨,正在其動。粗指之屏更全不起,
 * 是手機之人終不得見其所以然。
 *
 * This simulation always existed but was demoted to wallpaper: parked under a
 * 94%-black scrim at 70% opacity, static until you moved a mouse, and disabled
 * outright on coarse pointers. The single most characteristic thing this product
 * does was therefore invisible on arrival and dead on every phone. The fix is
 * not more animation — it is promoting the animation that was already here.
 *
 *   一、自行。至則日自行,不待其手。人未動而已見其網之變。
 *   二、指粗者亦動。但不予其控,而其行不息。
 *   三、著其數。時與蔭之比,皆實測之值,大書之 —— 此器之言,即在此二數。
 *
 * 減動者不動:靜於十二時,一幀而已。量之,正午之蔭最少(百之一五點九),
 * 非十四時(百之三五點六)—— 影短於日中,不在其最熱之刻。
 * 靜像當取其最險者,不當取其最善者。
 * Reduced motion gets ONE static frame at 12:00. Measured from the shipped data,
 * noon is the least-shaded hour at 15.9%, NOT 2pm at 35.6% — shadows are
 * shortest at solar noon, which is not the hottest hour. A still image of the
 * friendlier moment would be the tool flattering itself.
 *
 * 2d canvas,無 WebGL —— 與圖同理。此頁已因 WebGL 之賴而白過一次。
 */

/*
  此網所自出之日。landing 之網為一 json,無 manifest,故其日書於此,
  與 build-city 之所生同時 —— 器中所書者(Pack built …)即此囊之日。
  The landing net ships as a bare JSON with no manifest, so the build date it
  was cut from is recorded here; it is the same pack date the tool renders.
*/
const 建之日 = "Aug 28, 2026";

/** 蔭之界。與 曝之色 同 —— 所畫與所數不可異其語。 */
const 蔭之界 = 0.34;
/*
  等溫之界。逾此則其段加一實帶。
  取零點六二者:其上約當「午後之全曝」,故所帶者即人所當避之處,
  非泛言其熱。界若太低,則舉城皆帶,而帶遂無所指。
  Isotherm threshold: only segments above it get the band, so the band means
  "this crosses into full afternoon sun", not "it is warm here". Set too low,
  everything bands and the band stops pointing at anything.
*/
const 帶之界 = 0.62;
/** 日行一周之時。太速則如閃,太遲則人去而未見其變。 */
const 周之秒 = 16;

export function HeatField() {
  const cv = useRef<HTMLCanvasElement>(null);
  const 讀 = useRef<HTMLParagraphElement>(null);
  const 網 = useNet();

  useEffect(() => {
    const c = cv.current;
    if (!c || !網) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const 減動 =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 指粗者不予其控,而其日自行 —— 前此則全不起。
    const 可控 =
      typeof matchMedia === "function" && !matchMedia("(pointer: coarse)").matches;

    let raf = 0;
    let w = 0;
    let h = 0;
    let 時 = 減動 ? 3 / (網.hours.length - 1) : 0.08;
    let 的時 = 時;
    // 手既動,則日從其手,不復自行。
    let 自行 = !減動;
    let 始 = 0;
    let 前之文 = "";

    const 量 = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = c.getBoundingClientRect();
      w = r.width;
      h = r.height;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    量();

    const 動 = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      自行 = false;
      的時 = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    };

    /** 一幀之畫,並數其蔭。二者共一巡 —— 千四百段,不必再巡。 */
    const 畫 = (t: number) => {
      const f = t * (網.hours.length - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(網.hours.length - 1, i0 + 1);
      const k = f - i0;

      ctx.clearRect(0, 0, w, h);

      // 以長邊為度,短邊則溢之 —— 城當延於框外,不當為一島浮於其中。
      const s = Math.max(w, h) * 1.05;
      const ox = (w - s) / 2;
      const oy = (h - s) / 2;

      ctx.lineCap = "round";
      let 通數 = 0;
      let 蔭數 = 0;

      /*
        二巡而成:一巡為暈(寬而淡),一巡為芯(窄而明)。
        曝甚者其暈厚,故午之網如燒,而晨之網但為線。

        不用 shadowBlur —— 千四百筆各為其blur,每幀之費不可任。
        二巡者二千八百筆而已,皆無 blur,遠廉於是。
        Two passes — a wide dim halo, then a narrow bright core — instead of
        canvas shadowBlur, which would be computed per stroke and cannot be
        afforded 1,400 times a frame. Two plain passes are far cheaper and give
        the same bloom, so midday reads as heat rather than as more lines.

        其墨前此覆其面之百分之三有三 —— 是九成六為空。網為此頁之所以立,
        而其在屏上幾不可見。今加其寬,故其城可辨。
        Ink covered 3.3% of the canvas: 96.7% empty. The network is the reason
        this page exists and it was barely on screen.
      */
      /* 阻之色亦從其籤 —— canvas 不解 var(),故取其實於此,一畫一取。 */
      const 阻之色 = (() => {
        const v = getComputedStyle(document.documentElement)
          .getPropertyValue("--color-blocked").trim();
        return v ? `${v}${v.length === 7 ? "58" : ""}` : "rgba(154,144,134,0.34)";
      })();

      /*
        ── 失準之巡 ──────────────────────────────────────────────────────
        所推之段,其墨錯出一線:藍偏左,橙偏右 —— 即 riso 之版未合。
        FIRST VIEWPORT 所許者正在此,而前此但施於二數之上,是為annotation,
        非為其資之編碼。今施於其網,乃踐其諾。

        量之於洛城:所驗者百之三點九。故所錯者非其少數,乃其全網 ——
        而此正其所發現者:此城之人行道,幾無一段有明籤。
        故其少數之清晰者反為所求 —— 目之所歸,即其所驗之處。

        二路而已,非二千八百筆:凡所推者共一路,一藍一橙,各一 stroke。
        故其費為二,不隨其段而增。
        The contract promises inferred segments print out of register, and it
        was only ever applied to two numerals — an annotation, not an encoding.
        This puts it on the field.

        Only 3.9% of this network is verified, so nearly all of it ghosts. That
        inversion is the finding: the crisp segments are the rare ones, and the
        eye now goes to what is actually known. Batched into two paths, so the
        cost is two strokes rather than 2,800.
      */
      const 錯 = 1.5;
      const [藍r, 藍g, 藍b] = 曝之rgb(0);
      const [橙r, 橙g, 橙b] = 曝之rgb(1);
      for (const [dx, 色] of [
        [-錯, `rgba(${藍r},${藍g},${藍b},0.30)`],
        [錯, `rgba(${橙r},${橙g},${橙b},0.30)`],
      ] as const) {
        ctx.strokeStyle = 色;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (const [x1, y1, x2, y2, , 通, 推] of 網.edges) {
          if (!推 || 通 === 0) continue;
          ctx.moveTo(ox + x1 * s + dx, oy + y1 * s);
          ctx.lineTo(ox + x2 * s + dx, oy + y2 * s);
        }
        ctx.stroke();
      }

      for (const 巡 of [0, 1] as const) {
        for (const [x1, y1, x2, y2, su, 通] of 網.edges) {
          const 曝 = (su[i0] ?? 1) * (1 - k) + (su[i1] ?? 1) * k;
          if (通 === 0) {
            // 不可通者灰而細 —— 其不可行,不當奪目。其色亦從其籤。
            if (巡 === 0) continue;
            ctx.strokeStyle = 阻之色;
            ctx.lineWidth = 0.9;
          } else {
            if (巡 === 1) {
              通數++;
              if (曝 < 蔭之界) 蔭數++;
            }
            const [r, g, b] = 曝之rgb(曝);
            if (巡 === 0) {
              /*
                等溫之帶,非暈。
                前此此巡畫一寬而至淡之光,曝愈甚愈厚 —— 是熱為一團霧,其界不可指。
                riso 無此物:一版之墨,其緣必實。故今畫一實帶,惟過其界者有之,
                其緣不糊。所言者遂自「此處大約熱」變為「此處逾其界」。

                MUST stay hard-edged. The previous pass drew a wide, low-alpha
                halo that thickened with exposure — heat as an ambient fog with
                no locatable boundary. A Riso pull cannot make that mark: one
                drum lays one ink and its edge is the edge. This draws a real
                isotherm band instead, only where exposure crosses the
                threshold, so the claim changes from "roughly hot around here"
                to "this crosses the line".
              */
              if (曝 < 帶之界) continue;
              ctx.strokeStyle = `rgba(${r},${g},${b},0.20)`;
              ctx.lineWidth = 6.5;
            } else {
              ctx.strokeStyle = `rgba(${r},${g},${b},${0.72 + 曝 * 0.28})`;
              ctx.lineWidth = 1.5 + 曝 * 1.9;
            }
          }
          ctx.beginPath();
          ctx.moveTo(ox + x1 * s, oy + y1 * s);
          ctx.lineTo(ox + x2 * s, oy + y2 * s);
          ctx.stroke();
        }
      }

      /*
        其時之籤,必歸於所模之刻,不取其間 —— 所模者八刻而已,
        書「一三時」則是以所未算者為已算。此頁之戒,正在此。
        The clock SNAPS to a modelled bucket instead of showing the interpolated
        value. Only eight hours are actually computed; printing "13:00" would be
        rendering an unknown as a known, which is the one thing this project
        refuses to do anywhere else.
      */
      const 刻 = 網.hours[Math.round(f)] ?? 14;
      const 比 = 通數 ? Math.round((蔭數 / 通數) * 100) : 0;
      /*
        印之記三事:所模之刻、其蔭之比、囊之所建。
        FIRST VIEWPORT 書其三,而此鏈但書其二 —— 器中已有其日,而 landing 缺之。
        缺其日,則觀者不知其所見者何時之物,而印之記之所以為記者正在此。
        The rail is specified as hour, share, and build date. It shipped the
        first two; the tool already renders the build date, so the landing was
        simply dropping the one fact that says how old this pull is.
      */
      const 文 = `${String(刻).padStart(2, "0")}:00 — ${比}% of it in shade · ${建之日}`;
      // 文變乃書之。每幀而書,則其排版之算徒費。
      if (讀.current && 文 !== 前之文) {
        前之文 = 文;
        讀.current.textContent = 文;
      }
    };

    if (減動) {
      畫(時);
      const ro = new ResizeObserver(() => {
        量();
        畫(時);
      });
      ro.observe(c);
      return () => ro.disconnect();
    }

    /*
      視差。網隨捲而行,而其行遲於其頁 —— 故其城若在其文之後,非與之同面。
      不別立捲之聽者:此幀本已逐幀而行,取 scrollY 於此,無所增費。
      Parallax: the network drifts slower than the page, so the city reads as
      sitting behind the text rather than pasted onto it. No scroll listener is
      added — this loop already runs every frame, so reading scrollY here is free.
    */
    const 視差 = () => {
      const y = scrollY * 0.18;
      // 出其屏則止,不復算 —— 其下之節不見此網。
      c.style.transform = y < innerHeight ? `translate3d(0, ${y.toFixed(1)}px, 0)` : "";
    };

    const 幀 = (now: number) => {
      if (!始) 始 = now;
      視差();
      if (自行) {
        // 三角之波:晨而暮而復晨。日之行,往而必返。
        const p = ((now - 始) / (周之秒 * 1000)) % 1;
        的時 = p < 0.5 ? p * 2 : 2 - p * 2;
      }
      // 隨而不即,故其變如日之行,非如閘之啟。
      時 += (的時 - 時) * (自行 ? 0.5 : 0.07);
      畫(時);
      raf = requestAnimationFrame(幀);
    };

    const ro = new ResizeObserver(量);
    ro.observe(c);
    if (可控) addEventListener("pointermove", 動, { passive: true });
    raf = requestAnimationFrame(幀);
    return () => {
      ro.disconnect();
      if (可控) removeEventListener("pointermove", 動);
      cancelAnimationFrame(raf);
    };
  }, [網]);

  return (
    <>
      <canvas
        ref={cv}
        aria-hidden
        className="hero-net pointer-events-none absolute inset-0 size-full"
      />
      {/*
        此數即此器之言。前此但一句靜文,曰「橫掃以移其日」——
        今則其日自行,而其數隨之,故不必命人動,示之而已。

        ── 必不可為 live region ──────────────────────────────────────
        初書之時,置 role="status" aria-live="polite" 於此。其文一秒數變,
        而其變無窮 —— 讀屏遂終其頁而不絕於口,人不能聽其餘文。
        於一為盲者所設之器,此為大害,甚於全無此數。
        故此文與其 canvas 同隱於讀屏,而別書一句靜語:所言者同,而止於一。

        MUST NOT be a live region. It first shipped as role="status"
        aria-live="polite", but the text changes several times a second and never
        stops, so a screen reader would announce it continuously for as long as
        the page is open — drowning out everything else. In a tool built for
        blind and low-vision users that is worse than omitting the figure. The
        canvas and this readout are both hidden from assistive tech; the static
        sentence below carries the same finding, stated once.
      */}
      <p
        ref={讀}
        aria-hidden
        className="数 pointer-events-none absolute bottom-6 left-5 z-10 text-sm text-ink/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.95)] sm:bottom-8 lg:left-auto lg:right-8 lg:text-base"
      >
        12:00 — modelling shade…
      </p>
      {/* 其數皆實測,取於所載之 landing-net.json,非所擬。 */}
      <p className="sr-only">
        Modelled shade across 1,341 walkable sidewalk segments in downtown Los
        Angeles: 83% of them are in shade at 6am, 16% at noon, and 90% again by
        6pm. The animation above shows that change through the day.
      </p>
    </>
  );
}
