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
        聯繫之法在此。真址、真號未定,故不書 —— 偽之號置於一無障礙之站,
        害過於無。得其實而後補之,一行而已。
        Contact goes here. Deliberately absent rather than filled with a
        placeholder: a fake number or address on an accessibility tool is worse
        than none, since someone may actually dial it. One line to add once the
        real details are settled.
      */}
    </div>
  );
}
