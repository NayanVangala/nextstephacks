/**
 * footer 之末行:年、法之二頁、其源。
 *
 * landing 與說之頁各有其 footer,而其內容不同(一有說之頁之列,一無),
 * 故不合而為一;所同者但此一行,故但此一行共之。二處各書,則改其年須改二處。
 * Landing and the info pages have genuinely different footers — one carries the
 * page index, one does not — so they are not merged. Only this row is shared,
 * because it is the only part that is identical, and duplicating it would mean
 * two places to edit every January.
 *
 * 年自器而出,不硬書 —— 硬書之年,逾歲則自為其陳。
 * The year is read from the clock: a hardcoded one dates the site the moment
 * the year turns.
 */
export function SiteFooterMeta() {
  return (
    <div className="grid-container t-xs mt-[20px] flex flex-wrap items-center gap-x-[36px] gap-y-[12px] text-ink/70">
      <span>&copy; {new Date().getFullYear()} Passable</span>
      <a href="#/privacy" className="hover:text-ink">
        Privacy
      </a>
      <a href="#/terms" className="hover:text-ink">
        Terms
      </a>
      <a
        href="https://github.com/NayanVangala/nextstephacks"
        className="hover:text-ink"
        target="_blank"
        rel="noreferrer"
      >
        Source
      </a>
      {/*
        聯繫之法。無號 —— 此器不賴聲之通,而公之於眾之號但招其擾。

        其址直書之,不遮不繞。以 JS 綴之以避採者,則無 JS 者不得見,
        而讀屏所讀者為一串碎文 —— 此為無障礙之器,不可以避廣告之計
        易其可及。招擾者,公其址之常費也,非可以碎其文而免。
        Written plainly, not obfuscated. The usual JS/entity tricks to dodge
        scrapers break for anyone without JS and make screen readers announce
        fragments. On an accessibility tool that trade is not available: spam is
        the ordinary cost of a public address, and mangling the markup does not
        actually avoid it.
      */}
      <a href="mailto:nayan.vangala13@gmail.com" className="hover:text-ink">
        Contact
      </a>
    </div>
  );
}
