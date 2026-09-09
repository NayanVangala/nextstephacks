import { Suspense, lazy, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Landing } from "./landing/Landing";
import { 解說之頁, type 說之頁 } from "./landing/說之路";

/*
  惰載之二:器與說之頁。landing 不與焉。

  量之於其囊(sourcemap 歸其出之量於其源):leaflet 一四五兆、ajv 與 fast-uri
  一一七兆、sql.js 三九兆、五器四四兆 —— 三百餘兆,皆landing所不用者,
  而前此盡載於其首。一人但讀其landing者,不當荷之。

  landing 不惰 —— 其為眾人所入之門,惰之則其首畫更待一往返。
  Measured with a sourcemap byte-attribution: leaflet 145 kB, ajv+fast-uri
  117 kB, sql.js 39 kB, the views themselves 44 kB — over 300 kB the landing
  page never touches, all of it in the initial bundle. Landing itself stays
  eager: it is the common entry point, and making it lazy would put a round
  trip in front of the first paint for most visitors.
*/
const AppViews = lazy(() => import("./views/AppViews"));
const InfoPage = lazy(() =>
  import("./landing/InfoPage").then((m) => ({ default: m.InfoPage })),
);
import { CITIES, 預設之城 } from "./data/cities";
import { 解址 } from "./data/路之址";
import { SignIn } from "./auth/SignIn";
import { ThemeToggle } from "./components/ThemeToggle";
import { useEnter } from "./motion/useEnter";
import { RisoPlate } from "./landing/RisoPlate";

/*
  器首之版。自上而下而盡,自左而右而薄 —— 其濃處在其題之側,不在其資之上。
  A masthead band: densest beside the page title, gone by the bottom of the
  strip and thinning to the right, so it never reaches the map or the table.
*/
function 帶之場(x: number, y: number): number {
  /*
    版居其右,不居其左 —— 其文皆左起,而右四成為空。
    前此濃在其左,故其點落於題、於副、於印之記之下:文與網目相爭,
    正犯 Operate 之戒(版不可覆其資)。今反之,則版填其空,而文自居淨紙。
    審者謂此頁右四成為虛,而虛者讀之如未成 —— 一改而二病俱去。

    Was densest on the left, which put dots under the title, the subtitle and
    the press-run line — text competing with halftone, the exact Operate
    violation. Flipped: the plate now fills the empty right ~40% the reviewer
    called dead space, and every line of type sits on clean paper. One change
    answers both findings.
  */
  const 右 = Math.max(0, (x - 0.52) / 0.48);
  const 落 = Math.max(0, 1 - y * 1.05);
  return (右 * 落) ** 1.15;
}

type 之view = "route" | "reach" | "report" | "index" | "national";

const 之tabs: { id: 之view; label: string; blurb: string }[] = [
  { id: "route", label: "Route", blurb: "What is my safest path right now?" },
  { id: "reach", label: "Reach", blurb: "What can I get to, and can I get out?" },
  { id: "report", label: "City audit", blurb: "Where does this city fail?" },
  { id: "index", label: "Index", blurb: "Which neighbourhoods are cut off?" },
  /*
    國之表為第五。其異於前四者:前四皆一城之器(其入為 cityId),
    此則跨其城 —— 故其上之城之選,於此不主其所視,但存其所將往。
    按其一城之名,則易其城而入其審,是其選之所以不廢。
    The only cross-city tab. The city selector above does not drive it; picking
    a city row switches the selector and moves to that city's audit, which is
    what makes the selector still coherent while this tab is open.
  */
  { id: "national", label: "All cities", blurb: "How do the 38 downtowns compare?" },
];

export default function App() {
  // 址所載之城與 view 先於其預設 —— 分享之鏈必落於其所指之處。
  const 初 = 解址();
  const [view, setView] = useState<之view>(
    (["route", "reach", "report", "index", "national"] as const).includes(初.view as never)
      ? (初.view as 之view)
      : "route",
  );
  const [city, setCity] = useState(
    初.city && CITIES.some((c) => c.id === 初.city) ? 初.city : 預設之城,
  );
  // hash 為路:俾 landing、說之頁、app 各可直連,而不需 router。
  const [入app, set入app] = useState(() => location.hash.startsWith("#/app"));
  const [說頁, set說頁] = useState<說之頁 | null>(() => 解說之頁());
  const 減動 = useReducedMotion();
  // 易 view 或易城,則其面重入 —— 使人知所視者已換。
  const 面 = useEnter<HTMLDivElement>({ 位移: 10, 憑: `${view}|${city}` });

  useEffect(() => {
    const 聽 = () => {
      set入app(location.hash.startsWith("#/app"));
      set說頁(解說之頁());
      /*
        城與 view 亦須隨其址 —— 前此但取之於初,而後不復顧。
        故其址易而其面不易:貼一 #/app?c=den 之鏈於已開之頁,猶見洛城;
        前進後退於二城之間,亦不動。初載則無此病,故易隱。
        MUST re-read city and view here, not only at mount. They were read once
        from the initial hash and never again, so pasting a #/app?c=den link
        into an already-open tab kept showing Los Angeles, and Back/Forward
        between two cities moved the URL without moving the page. A cold load
        worked, which is what hid it.
      */
      const 址 = 解址();
      if (址.city && CITIES.some((c) => c.id === 址.city)) setCity(址.city);
      if (址.view && 之tabs.some((t) => t.id === 址.view)) setView(址.view as 之view);
    };
    addEventListener("hashchange", 聽);
    return () => removeEventListener("hashchange", 聽);
  }, []);

  /*
    城與 view 之記,主於此。
    前此惟 RouteView 書其址,而其 v 恆書 "route" —— 故自 Route 易至 Report 而
    分享之,其鏈仍歸於 Route;於 Report 之中易其城,其鏈仍指舊城。
    二參既為此處之狀,則當自此處書之;其餘(起訖、身、時)仍歸 RouteView。
    Only RouteView wrote the hash, with v hardcoded to "route", so switching to
    the Report tab and copying the URL gave a link back to Route, and changing
    city on any other tab left c stale. These two params are this component's
    state, so this is where they belong; RouteView still owns o/d/p/h.
  */
  useEffect(() => {
    if (!入app) return;
    const i = location.hash.indexOf("?");
    const q = new URLSearchParams(i < 0 ? "" : location.hash.slice(i + 1));
    if (q.get("c") === city && q.get("v") === view) return;
    q.set("c", city);
    q.set("v", view);
    // replace,不 push —— 易其 tab 非一往,不當塞其後退之路。
    history.replaceState(null, "", `#/app?${q.toString()}`);
  }, [入app, city, view]);

  const 退 = () => {
    // replaceState 而不書其 hash —— 直書之則遺一孤井(…/#),且每出入各塞一history。
    // 出、入、出、入,則欲離此頁者須退四次。入者當塞其一(其往也),出者不當。
    history.replaceState(null, "", location.pathname + location.search);
    set入app(false);
    set說頁(null);
    scrollTo({ top: 0 });
  };

  const 入 = () => {
    location.hash = "#/app";
    set入app(true);
    set說頁(null);
    scrollTo({ top: 0 });
  };

  // 說之頁先於 app —— 器之中亦可指之,而不當因其 hash 之殘而落於器。
  if (說頁 && !入app) {
    return (
      <Suspense fallback={<p className="grid-container py-24 text-ink/70">Loading…</p>}>
        <InfoPage 頁={說頁} onEnter={入} />
      </Suspense>
    );
  }

  if (!入app) {
    return (
      <Landing onEnter={入} />
    );
  }

  const 當之blurb = 之tabs.find((t) => t.id === view)?.blurb ?? "";

  return (
    <>
      {/*
        越navigation而直至其文。左列之器十有餘,鍵盤之人每易 view 皆須歷之而後
        及其果 —— 一鏈可省之。隱而不奪其位,受焦則見。
      */}
      <a href="#主" className="越">
        Skip to main content
      </a>

      {/*
        頂之chrome。其色深於其地,故為帶而非地之一段。
        其常既為暗,則此帶不復為「黑帶於淡地」,乃暗中之更暗者 ——
        其別在一髮之界,見 index.css 之 .chrome。
        The chrome sits a step darker than the workspace. Now that dark is the
        base theme this is no longer a black bar over white; the separation is a
        hairline, which is why .chrome carries a border in the dark palette.

        z 必逾千 —— leaflet 之控在千,不然則其鈕浮於此帶之上。
        MUST outrank Leaflet: its controls sit at z-index 1000, so anything less
        here lets the zoom buttons render on top of the sticky header.
      */}
      <header className="chrome sticky top-0 z-[1200] text-ink">
        <div className="grid-container">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
            <button
              type="button"
              onClick={退}
              aria-label="Passable — back to the overview"
              className="text-sm font-semibold uppercase tracking-wide transition-opacity duration-150 ease-quint hover:opacity-60"
            >
              Passable
            </button>

            <span aria-hidden className="h-4 w-px bg-ink/20" />

            <label htmlFor="city" className="sr-only">
              City
            </label>
            <select
              id="city"
              value={city}
              onChange={(ev) => setCity(ev.target.value)}
              // 其單從其地。報頭既為紙,則其單亦為紙 —— 前此釘 dark,為暗帶而設。
              style={{ colorScheme: "light" }}
              className="-ml-1 min-h-11 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium transition-colors hover:border-ink/25 hover:bg-ink/10"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
              {/*
                說之頁之鏈。疑生於用之際,不生於 landing 之上 —— 故其鏈當在此,
                不獨在前頁之末。
                Confusion happens here, not on the marketing page, so the guide
                has to be reachable from inside the tool and not only from the
                landing footer.
              */}
              <a
                href="#/help"
                className="min-h-11 rounded-md px-2 py-1.5 text-sm text-ink/70 transition-colors hover:bg-ink/10 hover:text-ink"
              >
                Help
              </a>
              {/* 題之擇。暗為其本,故此鈕為所以出之,非所以入之。 */}
              <ThemeToggle />
              <SignIn 暗 />
            </div>
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-6">
            <nav aria-label="Views" className="flex gap-0.5">
              {之tabs.map((t) => {
                const 當 = view === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setView(t.id)}
                    aria-current={當 ? "page" : undefined}
                    title={t.blurb}
                    className={`relative min-h-11 rounded-t-md px-3 py-2 text-sm transition-colors sm:px-4 ${
                      當
                        ? "font-semibold text-ink"
                        : "text-ink/70 hover:bg-ink/10 hover:text-ink"
                    }`}
                  >
                    {t.label}
                    {當 && (
                      <motion.span
                        layoutId="tab-underline"
                        transition={
                          減動
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 32 }
                        }
                        className="absolute inset-x-2 bottom-0 h-[3px] bg-ink"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/*
              每 view 各答一問。此文前此但存於 title,懸之而後見 —— 而其為
              全app最明之語,不當藏。窄屏則去之,其位不足。
              Each view answers one question. That copy previously lived only in
              a title attribute, visible on hover and to nobody on a touchscreen.
            */}
            <p className="hidden shrink-0 pb-2.5 text-xs text-ink/70 lg:block">
              {當之blurb}
            </p>
          </div>
        </div>
      </header>

      {/*
        器與 landing 同其格。前此器為 max-w-5xl(一〇二四),而 landing 之
        .grid-container 為一二〇rem —— 於一四四〇之屏,其面自一三四四縮為九七六。
        故人一擊「Open the tool」,其物立縮四分之一有奇,如二物之相代。
        The tool used max-w-5xl while the landing uses the 1920 grid: clicking
        the CTA visibly shrank the content from 1344px to 976px, which reads as
        arriving at a different product. One grid across both surfaces.
      */}
      {/*
        ── 器之版 ────────────────────────────────────────────────────────
        landing 有其版,而器無之 —— 二半之隔,其末在此。

        然器者 Operate 也,其職在事,不在言。故其版不可覆其圖、其表:
        資之上加一網目,則所量者與所飾者相混,而此樹之首戒正在一色一義。
        是以此版止於其首之帶(高二十四rem),自上而下而盡,其濃亦薄於
        landing 之半 —— 過其帶,則其下皆紙,表與圖各得其淨。

        The landing has plates and the tool had none; that was the last seam
        between the two halves. But this is an Operate surface: the plate may
        never sit under the map or a table, because a halftone over data mixes
        what is measured with what is decorative, and one-colour-one-meaning is
        this project's first rule. So it occupies the masthead band only,
        fading out by 24rem at roughly half the landing's density. Below that
        the sheet is bare and the data has it to itself.
      */}
      {/*
        版與文共一 relative 之身,而其序:版先,文後,文帶其 z。
        前此版為 -z-10,而負 z 之子,其畫在「塊之地」之前 —— 故凡有地之塊
        皆覆之。今不用負 z:版 z-0 而文 z-10,其序明白,不繫於畫序之細則。
        MUST NOT rely on negative z here. Negative-z children paint BEFORE
        in-flow block backgrounds, so every panel with a ground covered the
        plate. Explicit order instead: plate z-0, content z-10, inside one
        positioned parent.
      */}
      <div className="relative">
      <div
        aria-hidden
        /*
          必在其文之後。前此無 z,故其網目落於「Index」之題與其副之上 ——
          正犯上文所自立之戒(版不可覆其資)。-z-10 使之退於其後。
          MUST sit behind. Without a stacking order the dot screen landed on top
          of the page title and its subtitle — the precise violation the comment
          above forbids. It belongs under the content, not over it.
        */
        /*
          小屏不出其版。

          帶之場 之濃在其右四成,其所恃者「文皆左起,而右四成為空」——
          此於寬屏誠然,於窄屏則否:文既折,遂滿其幅,而其字正坐於網目之上。
          量之於三七五與七六八,其字之無地而入濃處者十有五,
          其首即「Heat-safe, step-free walking routes over 16,304 sidewalk
          segments.」—— 正犯上文所自立之戒。

          窄屏無空可容此版,故不出之,與 Nav 之五鏈同理(其註亦曰「量之,逾其地」)。

          The density field assumes the right ~40% is empty, which holds at
          1024px and up and fails below it: once the masthead prose wraps it
          fills the full width and sits directly on the dot screen. Measured 15
          bare text runs intruding at 375 and 768, including the page's own
          subtitle. There is no empty column to put the plate in at those
          widths, so it is not drawn — the same measured call Nav.tsx makes
          about its link list.
        */
        className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-[24rem] overflow-hidden lg:block"
      >
        <RisoPlate
          className="inset-0 size-full"
          色="var(--color-fullsun)"
          角={Math.PI / 4}
          最大={0.34}
          形={帶之場}
        />
      </div>

      <div className="grid-container relative z-10">
        {/* 帶既黏於上,則跳之的須讓其高,不然其題隱於帶下。 */}
        <div id="主" ref={面} tabIndex={-1} className="scroll-mt-28">
          {/*
            其待之文與 RouteView 之「Loading city data…」同其位與其色,
            故其chunk既至,其字易而其版不動。
            Same position and tone as the views' own loading line, so when the
            chunk lands the text changes without the layout jumping.
          */}
          <Suspense
            fallback={<p className="py-6 text-muted-foreground">Loading…</p>}
          >
            <AppViews
              view={view}
              city={city}
              onPickCity={(id) => {
                setCity(id);
                setView("report");
                scrollTo({ top: 0 });
              }}
            />
          </Suspense>
        </div>
      </div>
      </div>
    </>
  );
}
