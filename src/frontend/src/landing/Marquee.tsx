/**
 * Marquee。Palomino 以一萬二千像素之軌載六十二子,無盡而行。
 *
 * 此以 CSS 為之,不用 JS —— 其軌兩份相接,移半而歸零,故無縫。
 * reduced-motion 則止,而其文猶在。
 */
export function Marquee({
  items,
  速 = 40,
}: {
  items: string[];
  /** 一周之秒數。愈大愈緩。 */
  速?: number;
}) {
  const 兩份 = [...items, ...items];
  return (
    <div
      className="relative flex overflow-hidden border-y border-white/20 py-4"
      role="marquee"
      aria-label={items.join(", ")}
    >
      <div
        className="marquee-track flex shrink-0 gap-10 pr-10"
        style={{ animationDuration: `${速}s` }}
        aria-hidden="true"
      >
        {兩份.map((t, i) => (
          <span
            key={i}
            className="landing-label whitespace-nowrap text-white/70"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
