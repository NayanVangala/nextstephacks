import { useEffect } from "react";
import { Nav } from "./Nav";
import { Reveal, RevealGroup, RevealItem, RevealRule } from "./motion";
import { Magnetic } from "./Magnetic";
import { Marquee } from "./Marquee";
import { NetGlyph } from "./NetGlyph";
import { SplitText } from "./SplitText";
import { SunDial } from "./SunDial";
import { DifferenceCursor } from "./DifferenceCursor";
import { useCountUp, 解數 } from "./useCountUp";
import { useSmoothScroll } from "./useSmoothScroll";

/**
 * 說之頁。
 *
 * The landing sells; these explain. Everything here is written for someone who
 * has never opened a routing tool, is not a developer, and may be reading it at
 * 19px on a phone held at arm's length — plain words, short sentences, one idea
 * per paragraph. The visual system is the landing's, unchanged: same ground,
 * same display face, same hairlines. Only the leading is relaxed (.info-prose
 * in index.css), because 1.2 is a rhythm for headlines, not for paragraphs
 * anybody has to read four lines of.
 *
 * 無 router —— 址之 hash 即其路,同 App 之所為。四頁一檔,故其文可並讀而不相違。
 */

export const 說之頁 = ["help", "questions", "about", "limits"] as const;
export type 說之頁 = (typeof 說之頁)[number];

/** 自 hash 得其頁。非說之頁者回 null —— 未知之路一律歸於 landing。 */
export function 解說之頁(hash: string = location.hash): 說之頁 | null {
  const m = /^#\/(help|questions|about|limits)\b/.exec(hash);
  return m ? (m[1] as 說之頁) : null;
}

const 頁之目: { id: 說之頁; label: string; href: string }[] = 說之頁.map((id) => ({
  id,
  href: `#/${id}`,
  label: {
    help: "How to use it",
    questions: "Questions",
    about: "Who it's for",
    limits: "What we don't know",
  }[id],
}));

/* ── 其器 ──────────────────────────────────────────────────────────── */

function Section({
  children, label, className = "",
}: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <section
      aria-label={label}
      className={`landing-sec sun-rule-soft border-t ${className}`}
    >
      <div className="grid-container">{children}</div>
    </section>
  );
}

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

/**
 * 一問一答。
 *
 * 用 details 而不自造其開闔 —— 其鍵盤、其讀屏、其尋頁之文,瀏覽器已具之。
 * A native <details> already answers to Enter, announces expanded/collapsed to a
 * screen reader, and (in current browsers) opens itself when the reader uses
 * find-in-page. Re-implementing that with useState loses all three.
 */
function QA({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="sun-rule group border-b">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-[20px] py-[28px] text-left marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="h-xs max-w-3xl">{q}</span>
        <span
          aria-hidden
          className="mt-0.5 shrink-0 text-xl leading-none text-white/70 transition-transform duration-200 ease-quint group-open:rotate-45"
        >
          ＋
        </span>
      </summary>
      <div className="max-w-2xl pb-[28px] text-white/70">{children}</div>
    </details>
  );
}

/** 一步。其序真有先後,故存其編。 */
function Step({ n, h, children }: { n: string; h: string; children: React.ReactNode }) {
  return (
    <RevealItem className="sun-rule grid gap-[20px] border-t py-[36px] md:grid-cols-[6rem_1fr_1.3fr]">
      <span className="landing-label text-white/45">{n}</span>
      <h3 className="h-xs">{h}</h3>
      <div className="max-w-2xl text-white/65">{children}</div>
    </RevealItem>
  );
}

/**
 * 一數,自零而升。
 * 與 landing 之 Figure 同族:其上一髮則為所量,一紋則為所缺。
 * 讀者不待其文而已知此數之為量為缺。
 */
function CountUpFigure({ n, 延 }: { n: string; 延: number }) {
  const 解 = 解數(n);
  const { ref, 值 } = useCountUp(解?.數 ?? 0, { 延: 延 * 1000 });
  if (!解) return <>{n}</>;
  const 文 = 解.數 < 100 ? 值.toFixed(0) : Math.round(值).toLocaleString();
  return <span ref={ref}>{解.前}{文}{解.後}</span>;
}

function Figure({
  n, t, i, 缺 = false,
}: { n: string; t: string; i: number; 缺?: boolean }) {
  return (
    <RevealItem>
      <div aria-hidden className={缺 ? "纹-sun h-2" : "sun-bar h-px"} />
      <div className="数 landing-display h-2xl mt-5">
        <CountUpFigure n={n} 延={i * 0.08 + 0.15} />
      </div>
      <div className="mt-4 text-white/60">{t}</div>
    </RevealItem>
  );
}

/** 色之解。色不獨任其義 —— 每色必有其文,此頁尤然。 */
function Swatch({ c, name, children }: { c: string; name: string; children: string }) {
  return (
    <RevealItem className="sun-rule flex items-start gap-[20px] border-t py-[28px]">
      <span
        aria-hidden
        className={`mt-1 h-4 w-10 shrink-0 ${c}`}
      />
      <div>
        <h3 className="h-xs">{name}</h3>
        <p className="mt-2 max-w-md text-white/65">{children}</p>
      </div>
    </RevealItem>
  );
}

/* ── 頁之首尾 ──────────────────────────────────────────────────────── */

function Hero({ 眉, 題, 引 }: { 眉: string; 題: string; 引: string }) {
  return (
    <section
      aria-label={題}
      className="grid-container pt-[calc(var(--layout-padding-top)+3rem)] pb-[72px]"
    >
      <Reveal>
        <p className="landing-label mb-8 text-white/50">{眉}</p>
      </Reveal>
      {/*
        題分其字而入,與 landing 之 hero 同其手 —— 二面既為一物,則其入之法
        不當異。SplitText 自聚其字為詞,故長題可斷行而不孤其字。
      */}
      <SplitText as="h1" text={題} 延={120} className="landing-display h-2xl block max-w-5xl" />
      <Reveal 延={0.15}>
        <p className="mt-[36px] max-w-2xl text-white/70">{引}</p>
      </Reveal>
    </section>
  );
}

/**
 * 尾。四頁相通,而終歸於其器。
 * A reader who finishes an explanation should never have to use the back button
 * to find the next one, or the tool the explanation was about.
 */
function PageFooter({ 當, onEnter }: { 當: 說之頁; onEnter: () => void }) {
  return (
    <Section label="Keep reading">
      <SectionLabel>Keep reading</SectionLabel>
      <RevealGroup className="grid gap-[36px] sm:grid-cols-2 lg:grid-cols-3">
        {頁之目
          .filter((p) => p.id !== 當)
          .map((p) => (
            <RevealItem key={p.id}>
              <a
                href={p.href}
                className="sun-rule block border-t pt-5 transition-opacity duration-150 ease-quint hover:opacity-60"
              >
                <span className="landing-label text-white/45">Read next</span>
                <span className="landing-display h-lg mt-4 block">{p.label}</span>
              </a>
            </RevealItem>
          ))}
      </RevealGroup>

      <Reveal>
        <div className="mt-[72px] flex flex-wrap items-center gap-[20px]">
          <Magnetic>
            <button
              type="button"
              onClick={onEnter}
              className="rounded-full bg-white px-8 py-4 text-black transition-[opacity,scale] duration-150 ease-quint hover:scale-[1.03] hover:opacity-90"
            >
              Open the tool
            </button>
          </Magnetic>
          <a
            href="#top"
            className="group inline-flex items-center gap-2 border-b border-white/30 pb-1 transition-colors duration-150 ease-quint hover:border-white"
          >
            Back to the front page
          </a>
        </div>
      </Reveal>
    </Section>
  );
}

/* ── 一、何以用之 ──────────────────────────────────────────────────── */

function HelpPage() {
  return (
    <>
      <Hero
        眉="How to use it"
        題="FIVE STEPS, AND YOU ARE WALKING."
        引="There is nothing to install and nothing to sign up for. If you can use a map on your phone, you can use this. This page explains every screen, every color, and what to do when it tells you that you cannot get there."
      />

      <Section label="Before you start">
        <SectionLabel>Before you start</SectionLabel>
        <RevealGroup className="grid gap-[36px] md:grid-cols-3">
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="h-xs">It works in your web browser</h3>
            <p className="mt-4 text-white/65">
              On a phone, a tablet or a computer. There is no app to download.
            </p>
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="h-xs">You need to be online</h3>
            <p className="mt-4 text-white/65">
              The map of your city has to be downloaded the first time you open
              it, and the temperature is checked live. It will not work with the
              signal off.
            </p>
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="h-xs">You do not need an account</h3>
            <p className="mt-4 text-white/65">
              There is a “Sign in” button. You can ignore it. It only exists so
              that people who want their name attached to a problem they report
              can have it.
            </p>
          </RevealItem>
        </RevealGroup>
      </Section>

      <Section label="Step by step">
        <SectionLabel>Step by step</SectionLabel>
        <RevealGroup>
          <Step n="01" h="Choose your city">
            <p>
              The city name sits at the top of the screen, next to the word
              Passable. Thirty-eight American city centers are covered. It is the
              center of each city, not the whole of it — see{" "}
              <a className="underline underline-offset-4 hover:opacity-60" href="#/limits">
                what we don&rsquo;t know
              </a>
              .
            </p>
          </Step>

          <Step n="02" h="Say what applies to you">
            <p>
              Tick any of the three boxes. This is the most important step,
              because it changes which sidewalks count as usable at all — not
              simply the order they come in.
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <strong className="font-semibold text-white">Wheelchair user</strong> —
                leaves out steps, steep slopes, high curbs, and stretches that
                are too narrow or unpaved.
              </li>
              <li>
                <strong className="font-semibold text-white">Heat-sensitive</strong> —
                counts sun very heavily. Meant for people with MS, POTS, a heart
                condition, or medication that reacts to heat.
              </li>
              <li>
                <strong className="font-semibold text-white">Blind or low vision</strong> —
                avoids crossings with no signal, and prefers sidewalks with
                tactile paving.
              </li>
            </ul>
            <p className="mt-4">You can tick more than one.</p>
          </Step>

          <Step n="03" h="Choose the time of day">
            <p>
              The time slider runs from 6 in the morning to 8 at night, in
              two-hour steps. Move it to the hour you actually plan to walk.
              Shade moves as the sun moves: a street that is shaded at 8am can
              be in full sun at 2pm, and the tool will give you a different
              answer for each.
            </p>
            {/*
              其文言影隨日而行,而未之示 —— 是以言代示。此圖即其事,
              且為 landing 所已具,不必再造。
            */}
            <SunDial />
          </Step>

          <Step n="04" h="Say where you are, then where you are going">
            <p className="mb-4">
              Three ways to do it, and you can mix them:
            </p>
            <ul className="space-y-3">
              <li>
                <strong className="font-semibold text-white">Type it.</strong>{" "}
                Put a street name or an address in the search box. Pick one of
                the results and the tool finds the nearest usable sidewalk to
                it.
              </li>
              <li>
                <strong className="font-semibold text-white">Tap the map.</strong>{" "}
                One tap sets your start, the next sets your destination.
              </li>
              <li>
                <strong className="font-semibold text-white">Use my location.</strong>{" "}
                Your phone tells the page where you are. Your browser asks
                permission first, and the page keeps the answer to itself.
              </li>
            </ul>
          </Step>

          <Step n="05" h="Read the route">
            <p className="mb-5">
              You get two things: a colored line drawn on the map, and the same
              route written out as a list of directions you can read without
              looking at the map at all. The colors are explained below.
            </p>
            {/* 此頁言其五步而不示其一 —— 一圖足抵其全文。 */}
            <figure>
              <img
                src={`${import.meta.env.BASE_URL}shot-route.jpg`}
                width={1600}
                height={1075}
                loading="lazy"
                decoding="async"
                alt="The Route screen. A green step-free path runs from El Pueblo to the Los Angeles Central Library across a map of downtown, with the surrounding sidewalks colored red for full sun and blue for shade. The wheelchair profile is ticked and the time is set to 2pm."
                className="sun-rule w-full rounded-lg border"
              />
              <figcaption className="mt-4 text-white/55">
                Downtown Los Angeles at 2pm, wheelchair profile. The green line
                is the route. Red is full sun, blue is shade.
              </figcaption>
            </figure>
          </Step>
        </RevealGroup>
      </Section>

      <Section label="What the colors mean">
        <SectionLabel>What the colors mean</SectionLabel>
        <Reveal>
          <p className="mb-10 max-w-2xl text-white/70">
            Every sidewalk is colored by how much sun falls on it at the hour
            you picked. Color is never the only clue — the same information is
            written in words next to it, everywhere it appears.
          </p>
        </Reveal>
        <RevealGroup className="max-w-3xl">
          <Swatch c="bg-[var(--color-shade)]" name="Blue — in shade">
            A building, a tree or a bridge is between this sidewalk and the sun
            at that hour.
          </Swatch>
          <Swatch c="bg-[var(--color-midsun)]" name="Yellow — partly sunny">
            Some shade, some sun. Roughly a third to two thirds of it is exposed.
          </Swatch>
          <Swatch c="bg-[var(--color-fullsun)]" name="Red — full sun">
            Nothing is shading it. On a hot afternoon this is the part of the
            walk that will hurt.
          </Swatch>
          <Swatch c="纹-sun" name="Diagonal lines — we do not know">
            The underlying data is missing here, so no honest color can be put
            on it. This mark means a gap, and it is never quietly filled in with
            a guess.
          </Swatch>
        </RevealGroup>
      </Section>

      <Section label="The four screens">
        <SectionLabel>The four screens</SectionLabel>
        <RevealGroup className="grid gap-[36px] sm:grid-cols-2">
          {/*
            像之式惟三 —— INDEX 無之,故其位空而不強為之。造一像以填其格,
            是以飾充其闕,正此物之所戒。
            NetGlyph has three modes and INDEX is not one of them. Inventing a
            fourth glyph to square the grid would be decoration standing in for
            a thing that does not exist — the exact habit this page argues
            against three sections further down.
          */}
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="landing-display h-lg">ROUTE</h3>
            <p className="mt-4 text-white/65">
              From here to there, right now. The one to start with.
            </p>
            <NetGlyph 式="route" />
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="landing-display h-lg">REACH</h3>
            <p className="mt-4 text-white/65">
              Everywhere you could get to from one point before you run out of
              sun budget — and whether a cooling center is inside it.
            </p>
            <NetGlyph 式="reach" />
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="landing-display h-lg">REPORT</h3>
            <p className="mt-4 text-white/65">
              Where this city fails, in numbers. Useful for showing somebody
              else.
            </p>
            <NetGlyph 式="report" />
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="landing-display h-lg">INDEX</h3>
            <p className="mt-4 text-white/65">
              Which neighborhoods are cut off from the rest of the city on
              foot.
            </p>
          </RevealItem>
        </RevealGroup>
      </Section>

      <Section label="The sun budget">
        <SectionLabel>The sun budget</SectionLabel>
        <Reveal>
          <h2 className="landing-display h-lg max-w-4xl">
            A sun-meter is one meter walked in full sun, at the hottest part of
            the day.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <div className="mt-[36px] max-w-2xl space-y-4 text-white/65">
            <p>
              On the Reach screen you set a budget in sun-meters, and the tool
              shows you everywhere you could reach before spending it. A meter
              walked in shade costs you much less than a meter in full sun, so
              the shaded routes stretch your budget further.
            </p>
            <p>
              There is no correct number to put here. Start with something you
              know you can manage on a bad day and adjust it.{" "}
              <strong className="font-semibold text-white">
                It is a planning tool, not a medical limit.
              </strong>{" "}
              Follow the advice of your own doctor over anything on this screen.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section label="If it says you cannot get there">
        <SectionLabel>If it says you cannot get there</SectionLabel>
        <Reveal>
          <h2 className="landing-display h-lg max-w-4xl">
            That is an answer, not a breakdown.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <div className="mt-[36px] max-w-2xl space-y-4 text-white/65">
            <p>
              Most maps will route you anyway and let you find the steps
              yourself. This one stops and tells you what is in the way — for
              example, three flights of steps, sixty meters of them.
            </p>
            <p>
              Sometimes the barrier is real. Sometimes it is only that nobody
              has recorded that stretch of sidewalk yet, and the tool says which
              of the two it is rather than pretending to be sure.
            </p>
            <p>
              If you know the map is wrong, say so. There is a “Report a
              problem” form on the Route screen. It takes about fifteen seconds
              and you do not have to give your name.
            </p>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

/* ── 二、問答 ──────────────────────────────────────────────────────── */

function QuestionsPage() {
  return (
    <>
      <Hero
        眉="Questions"
        題="THE THINGS PEOPLE ACTUALLY ASK."
        引="Short answers, in plain words. Tap a question to open it."
      />

      <Section label="Questions and answers">
        <SectionLabel>Using it</SectionLabel>
        <div className="info-qa sun-rule max-w-4xl border-t">
          <QA q="Does it cost anything?">
            <p>
              No. It is free, there are no adverts, and there is nothing to buy
              later. It was built for a hackathon and it is not a business.
            </p>
          </QA>

          <QA q="Do I have to make an account?">
            <p>
              No. Everything works without one. Signing in is optional and only
              does one thing: it puts your name on problems you report, so
              somebody else can confirm them. Reporting works perfectly well
              without it.
            </p>
          </QA>

          <QA q="Will it work on my phone?">
            <p>
              Yes — any reasonably recent phone, tablet or computer with a web
              browser. There is nothing to install from an app store.
            </p>
          </QA>

          <QA q="Does it work without an internet connection?">
            <p>
              No. It has to download your city&rsquo;s sidewalk data the first
              time you open it, and it checks the current temperature and any
              weather warnings live. Plan the walk before you leave the house,
              or keep your signal on.
            </p>
          </QA>

          <QA q="Which cities can I use it in?">
            <p className="mb-3">
              Thirty-eight city centers in the United States: Atlanta, Austin,
              Baltimore, Bellevue, Boston, Charlotte, Chicago, Cleveland,
              Columbus, Dallas, Denver, Detroit, Green Bay, Houston,
              Indianapolis, Kansas City, Las Vegas, Los Angeles, Memphis,
              Miami, Milwaukee, Minneapolis, Nashville, New Orleans, New York,
              Orlando, Philadelphia, Phoenix, Pittsburgh, Portland,
              Sacramento, Salt Lake City, San Antonio, San Diego,
              San Francisco, Seattle, St. Louis and Washington, DC.
            </p>
            <p>
              It is the downtown area of each one, not the whole metropolitan
              area. If you are outside that area, the map will have nothing to
              show you.
            </p>
          </QA>

          <QA q="Can I print the directions, or share them?">
            <p className="mb-3">
              Yes to both. The route is written out in words underneath the map,
              and your browser&rsquo;s own Print command will print the page.
            </p>
            <p>
              To share it, copy the web address out of the address bar once the
              route is drawn. The two points, your settings and the hour are all
              written into that address, so whoever opens it sees exactly the
              route you saw.
            </p>
          </QA>
        </div>
      </Section>

      <Section label="Privacy">
        <SectionLabel>Privacy</SectionLabel>
        <div className="info-qa sun-rule max-w-4xl border-t">
          <QA q="Are you tracking where I go?">
            <p className="mb-3">
              No. The route is worked out on your own device, inside the browser
              page. Your starting point and your destination are not sent to us,
              because there is no “us” to send them to — there is no server
              behind this that stores anything.
            </p>
            <p className="mb-3">
              A few things do leave your device. Downloading your city&rsquo;s
              map data. The map picture itself, which is drawn from tiles
              fetched as you pan and zoom, so those services can see roughly
              which part of the city you are looking at. A temperature and
              weather-warning lookup, which uses the center of the city you
              picked and not your position. And, only if you use the search
              box, the words you type in it.
            </p>
            <p>
              That search goes to OpenStreetMap&rsquo;s public address service.
              We do not see it, but they do, and they are a separate
              organization with their own privacy policy. If you would rather
              not send anything at all, pick a place from the list underneath
              the search box, or tap the map — neither of those sends what you
              are looking for.
            </p>
          </QA>

          <QA q="What happens if I press “Use my location”?">
            <p>
              Your browser asks your permission first, and you can say no. If
              you say yes, your position is used inside the page to find the
              nearest sidewalk and nothing else. It is not stored and not sent
              anywhere — unlike the search box, which does send what you type.
            </p>
          </QA>

          <QA q="One warning about sharing a link">
            <p>
              Because the route is written into the web address, anyone you send
              that link to can see where the walk starts and ends. If it starts
              at your home, that is worth thinking about before you post it
              somewhere public.
            </p>
          </QA>
        </div>
      </Section>

      <Section label="Trusting it">
        <SectionLabel>Trusting it</SectionLabel>
        <div className="info-qa sun-rule max-w-4xl border-t">
          <QA q="Is this medical advice?">
            <p>
              No, and it is important that it is not read as any. Nothing here
              knows anything about your health. The heat figures are a planning
              aid built from public data. Where your own doctor&rsquo;s advice
              and this tool disagree, your doctor is right.
            </p>
          </QA>

          <QA q="How accurate is it?">
            <p className="mb-3">
              It is as accurate as the public records it is built on, which
              varies a great deal from city to city and from street to street.
            </p>
            <p>
              Rather than hide that, the tool marks it: anywhere you see
              diagonal hatching, the data is missing and the tool is telling you
              it does not know. There is a whole page on this —{" "}
              <a className="underline underline-offset-4 hover:opacity-60" href="#/limits">
                what we don&rsquo;t know
              </a>
              .
            </p>
          </QA>

          <QA q="The map is wrong about my street. What do I do?">
            <p>
              Tell it. On the Route screen, pick the stretch of sidewalk that is
              wrong and use “Report a problem”. You can say the curb ramp is
              broken, the sidewalk is blocked, there is no shade where the map
              shows some, or that a place is closed. It takes seconds, and no
              account is needed.
            </p>
          </QA>

          <QA q="Why does it sometimes refuse to answer?">
            <p>
              Because there are places it genuinely cannot get you to, and
              places where the records run out. Saying so is the point. A
              confident wrong answer is far worse than an honest gap when the
              consequence is you standing at the bottom of a flight of steps.
            </p>
          </QA>

          <QA q="Who made it, and why?">
            <p>
              It was built for NextStep Hacks 2026 on the Earth Forward theme,
              out of public open data. There is more on the{" "}
              <a className="underline underline-offset-4 hover:opacity-60" href="#/about">
                who it&rsquo;s for
              </a>{" "}
              page.
            </p>
          </QA>
        </div>
      </Section>
    </>
  );
}

/* ── 三、為誰而作 ──────────────────────────────────────────────────── */

function AboutPage() {
  return (
    <>
      <Hero
        眉="Who it's for"
        題="THE SHORTEST WAY IS NOT ALWAYS THE WAY YOU CAN TAKE."
        引="Passable is a walking-route tool for people for whom a flight of steps, a missing curb ramp or two hundred meters of bare sidewalk in August is not an inconvenience but a full stop."
      />

      {/*
        走馬在題之後、節之前,與 landing 同其位 —— 為一帶,非一注。
        置之於「其源」之上則與其下之格重,是一事而二書;此頁之格既詳言之,
        則其帶當在人未讀之先,為其記而已。
        Same position as the landing's: a texture band between the headline and
        the first section. It sat above the sources grid at first, which listed
        the identical names one line below — the band as duplicate rather than
        as texture.
      */}
      <div className="border-t border-white/10 py-[20px]">
        <Marquee items={[
          "OpenStreetMap", "Open-Meteo", "US Census TIGER", "ACS 5-year",
          "National Weather Service", "LA Metro GTFS", "Client-side A*",
          "Projected shadows", "No API keys", "No account",
        ]} />
      </div>

      <Section label="Who it is for">
        <SectionLabel>Who it is for</SectionLabel>
        <RevealGroup className="grid gap-[36px] md:grid-cols-3">
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="h-xs">People who use a wheelchair or walking aid</h3>
            <p className="mt-4 text-white/65">
              A route with three steps in it is not a slightly worse route. It
              is not a route. The tool treats it that way.
            </p>
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="h-xs">People whose bodies react badly to heat</h3>
            <p className="mt-4 text-white/65">
              MS, POTS, a heart condition, medication that does not get on with
              the sun, or simply being older in a city that keeps getting
              hotter. Shade is not a comfort here, it is the constraint.
            </p>
          </RevealItem>
          <RevealItem className="sun-rule border-t pt-5">
            <h3 className="h-xs">People who are blind or have low vision</h3>
            <p className="mt-4 text-white/65">
              A crossing with no signal and no tactile paving is a different
              proposition from one with both, and no ordinary map tells you
              which is which.
            </p>
          </RevealItem>
        </RevealGroup>
      </Section>

      <Section label="Why it exists">
        <SectionLabel>Why it exists</SectionLabel>
        <Reveal>
          <h2 className="landing-display h-lg max-w-4xl">
            Every routing app in the world optimizes for shortest. A few
            optimize for shade. None of them will do both at once — and the
            step-free path is usually the longer, more exposed one.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <div className="mt-[36px] max-w-2xl space-y-4 text-white/65">
            <p>
              So the two things that matter most to a disabled pedestrian in a
              hot city pull against each other, and you are left to reconcile
              them yourself, on the sidewalk, in the heat.
            </p>
            <p>
              Passable treats them as one problem, because for a lot of people
              they are one problem. It works out both at the same time and shows
              you the trade-off instead of hiding it.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section label="Three ideas">
        <SectionLabel>The three ideas behind it</SectionLabel>
        <div className="sun-rule border-t">
          {[
            {
              h: "Shade is a place and a time",
              p: "The sun is in a different part of the sky at 8am and 4pm, so the shadow of the same building falls on a different sidewalk. The tool works out where the shadows land at eight points across the day, from the real position of the sun and the real heights of the buildings — which means it can tell you that the walk you are dreading is fine if you leave an hour earlier.",
            },
            {
              h: "Not where you want to go — where you can get",
              p: "It is a different question, and a more useful one. Given where you are and how much sun you can take today, what is actually inside your range? Is there a cooling center in it? For a lot of people that answer is the difference between going out and staying in.",
            },
            {
              h: "Say what you do not know",
              p: "Confident guesses are how accessibility data hurts people. Where the records are missing, the tool marks the gap and says so, rather than filling it with something plausible. It is the single rule the whole thing is built around.",
            },
          ].map((s) => (
            <Reveal key={s.h}>
              <div className="sun-rule grid gap-[20px] border-b py-[36px] md:grid-cols-[1fr_1.3fr]">
                <h3 className="landing-display h-lg">{s.h}</h3>
                <p className="max-w-2xl text-white/65">{s.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section label="Where the information comes from">
        <SectionLabel>Where the information comes from</SectionLabel>
        <Reveal>
          <p className="mb-10 max-w-2xl text-white/70">
            All of it is public and free for anyone to check. Nothing here is
            private data and nothing was bought.
          </p>
        </Reveal>
        <RevealGroup className="grid gap-[36px] sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["OpenStreetMap", "The sidewalks, curbs, crossings and steps themselves, mapped by volunteers."],
            ["Building footprints and heights", "What casts the shadow. Where a height has never been published, the gap is marked rather than guessed."],
            ["US Census (TIGER and ACS)", "Neighborhood boundaries and household income, used to ask who is left on the wrong side of a barrier."],
            ["Open-Meteo", "The current temperature in the city you are looking at."],
            ["National Weather Service", "Official heat warnings, shown as they are issued."],
            ["LA Metro", "Transit stops and service alerts, in Los Angeles only."],
            ["Esri", "Aerial imagery, used only when you switch the map to Satellite."],
          ].map(([h, p]) => (
            <RevealItem key={h} className="sun-rule border-t pt-5">
              <h3 className="h-xs">{h}</h3>
              <p className="mt-4 text-white/60">{p}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section label="What it is not">
        <SectionLabel>What it is not</SectionLabel>
        <Reveal>
          <div className="max-w-2xl space-y-4 text-white/70">
            <p>
              It is not medical guidance, and it does not know anything about
              your health.
            </p>
            <p>
              It is not a live view of the street. A sidewalk that was open when
              the data was collected can be dug up this morning.
            </p>
            <p>
              It is not a replacement for local knowledge, and it is not a
              substitute for a city fixing its sidewalks.
            </p>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

/* ── 四、所不知者 ──────────────────────────────────────────────────── */

function LimitsPage() {
  return (
    <>
      <Hero
        眉="What we don't know"
        題="THE GAPS ARE PART OF THE ANSWER."
        引="A tool that hides what it does not know is more dangerous than one that admits it, because you find out at the bottom of the steps. Here is everything this one is unsure about, in plain words."
      />

      <Section label="The mark for a gap">
        <SectionLabel>The mark for a gap</SectionLabel>
        <Reveal>
          <div className="max-w-3xl">
            <div aria-hidden className="纹-sun h-4 w-full" />
            <h2 className="landing-display h-lg mt-8">
              Diagonal lines mean nobody knows.
            </h2>
            <p className="mt-[36px] text-white/70">
              Wherever you see that hatching — on the map, in a figure, in a
              report — the underlying record is missing and the tool has
              refused to guess. It is the one thing it will not quietly smooth
              over. If a number matters to your decision, look for the hatching
              first.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section label="The size of the gaps">
        <SectionLabel>The size of the gaps</SectionLabel>
        {/*
          此四數,三缺一量。紋者為所缺,髮者為所量 —— 其別在其上一分之高,
          讀者不待其文而已知之。與 landing 之「Key figures」同其記。
          Three of these four are absences, and the hatch says so before the
          caption does. Same mark, same meaning, as the landing's figures.
        */}
        <RevealGroup className="grid gap-x-[36px] gap-y-[72px] sm:grid-cols-2 lg:grid-cols-4">
          <Figure i={0} n="91%" 缺 t="of downtown Phoenix buildings have no published height" />
          <Figure i={1} n="98%" 缺 t="of Green Bay's have none either" />
          <Figure i={2} n="299" 缺 t="LA Metro stops with no wheelchair field at all" />
          <Figure i={3} n="36" t="neighborhoods that are fully step-free and still cut off" />
        </RevealGroup>
        <Reveal>
          <p className="mt-[36px] flex items-center gap-[20px] text-white/45">
            <span aria-hidden className="纹-sun inline-block h-2 w-10 shrink-0" />
            Hatched means the data does not exist. The last figure is measured,
            which is why it is not.
          </p>
        </Reveal>
      </Section>

      <Section label="What is missing">
        <SectionLabel>What is missing, and where</SectionLabel>
        <div className="sun-rule border-t">
          {[
            {
              h: "Building heights",
              p: "Shadows are worked out from how tall the buildings are, and a great many cities have simply never published that. Phoenix has a published height for about nine buildings in a hundred downtown. Green Bay, about two in a hundred. Where the height is unknown it is estimated, the estimate is marked as an estimate, and the shade figure for that street should be read as a rough indication rather than a measurement.",
            },
            {
              h: "Whether a bus stop is usable",
              p: "Los Angeles Metro's public timetable feed leaves out the field that says whether a stop can be boarded in a wheelchair. Not blank — absent, for all 299 stops in the area covered. So the tool cannot tell you whether the stop at the end of your route is one you can use.",
            },
            {
              h: "Service disruptions",
              p: "The public feed for cancelled services still answers, and still returns tidy, well-formed data. That data is from October 2022. It is shown with its date attached, and it should be treated as history rather than news.",
            },
            {
              h: "Anything outside the center",
              p: "Each city is a downtown extract, not the whole city. Step outside that box and there is nothing to route on. This also means the tool cannot answer questions about a city as a whole, and it says so wherever somebody might be tempted to ask one.",
            },
            {
              h: "Whether shade and income are linked",
              p: "We joined household income to the 1,288 neighborhoods and got a figure back for 1,101 of them. Only eighteen cities have income estimates precise enough to test against shade, and across those eighteen the relationship will not hold still: strongly positive in Miami, negative in Boston, essentially nothing in Los Angeles. That is not an answer, and a downtown extract is the wrong instrument for the question. Every city page says as much.",
            },
          ].map((s) => (
            <Reveal key={s.h}>
              <div className="sun-rule grid gap-[20px] border-b py-[36px] md:grid-cols-[1fr_1.3fr]">
                <h3 className="landing-display h-lg">{s.h}</h3>
                <p className="max-w-2xl text-white/65">{s.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section label="A number that misleads">
        <SectionLabel>One number that misleads</SectionLabel>
        <Reveal>
          <h2 className="landing-display h-lg max-w-4xl">
            99.1% of the sidewalk network is passable, which sounds close to
            solved. It is the wrong number.
          </h2>
        </Reveal>
        <Reveal 延={0.1}>
          <div className="mt-[36px] max-w-2xl space-y-4 text-white/65">
            <p>
              Thirty-six neighborhoods across sixteen cities are 100% step-free
              and 0% connected. Every meter of sidewalk in them passes every test,
              and none of it reaches the rest of the city. A single flight of
              steps at the edge does that.
            </p>
            <p>
              Chicago is 97.7% passable for a wheelchair user and still strands
              nearly two thousand points — about one in eleven of its walkable
              network — behind short flights of steps. Both figures are true.
              Only one of them is about whether you can get anywhere.
            </p>
            <p>
              This is why the tool reports what you can reach rather than what
              percentage passes.
            </p>
          </div>
        </Reveal>
      </Section>

      <Section label="Things that change without us">
        <SectionLabel>Things that change without us knowing</SectionLabel>
        {/*
          界隨其入而行,如畫線於所讀之句 —— landing 之「What we found」用此手。
          彼與此皆為所自陳之短語,故同其形則同其讀。
        */}
        <div className="max-w-4xl">
          <RevealRule className="sun-bar h-px" />
          {[
            "Roadworks, a skip on the sidewalk, a lift out of order, a shop awning taken down. None of that is in any public dataset, and the tool will not know about it.",
            "Trees are shade in summer and much less of it in winter, and the model does not follow the seasons that closely.",
            "A sidewalk that was open when the data was collected can be dug up this morning. Nothing here is a live view of the street.",
            "If you find something wrong, the “Report a problem” form on the Route screen is the fastest way to fix it for the next person. It is anonymous unless you choose otherwise.",
          ].map((t) => (
            <div key={t}>
              <Reveal>
                <p className="h-xs py-[36px]">{t}</p>
              </Reveal>
              <RevealRule className="sun-bar h-px" />
            </div>
          ))}
        </div>
      </Section>

      <Section label="Not medical guidance">
        <SectionLabel>Not medical guidance</SectionLabel>
        <Reveal>
          <div className="max-w-2xl space-y-4 text-white/70">
            <p>
              The sun budget is a rough number for planning a walk. It is not a
              clinical threshold, it has not been validated against one, and it
              knows nothing at all about you.
            </p>
            <p>
              Two people with the same condition on the same street on the same
              afternoon can have completely different limits. Use your own, and
              your doctor&rsquo;s.
            </p>
          </div>
        </Reveal>
      </Section>
    </>
  );
}

/* ── 頁 ────────────────────────────────────────────────────────────── */

const 頁之身: Record<說之頁, () => React.ReactElement> = {
  help: HelpPage,
  questions: QuestionsPage,
  about: AboutPage,
  limits: LimitsPage,
};

export function InfoPage({ 頁, onEnter }: { 頁: 說之頁; onEnter: () => void }) {
  useSmoothScroll();
  const Body = 頁之身[頁];

  // 易頁則歸其首。hash 之易不動其捲,故不自為之,則新頁自中而起。
  useEffect(() => {
    scrollTo({ top: 0 });
  }, [頁]);

  return (
    <div className="landing info-prose text-white">
      {/* landing 有此記而說之頁無之,則同一物而二手。 */}
      <DifferenceCursor />
      <Nav onEnter={onEnter} 節={頁之目} />
      {/*
        跳之鏈。此頁之 nav 有六,而其文長 —— 鍵盤與讀屏者不當歷之而後及其文。
      */}
      <a href="#info-main" className="越">
        Skip to main content
      </a>
      <main id="info-main" tabIndex={-1}>
        <Body />
        <PageFooter 當={頁} onEnter={onEnter} />
      </main>

      <footer className="border-t border-white/10 py-[36px]">
        <div className="grid-container flex flex-wrap items-center justify-between gap-[20px] text-white/45">
          <a href="#top" className="hover:text-white">
            NextStep Hacks 2026 · Earth Forward
          </a>
          <span>Thirty-eight US downtowns</span>
          <span>Not medical guidance</span>
        </div>
      </footer>
    </div>
  );
}
