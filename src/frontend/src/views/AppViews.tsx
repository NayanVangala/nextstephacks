import { RouteView } from "./RouteView";
import { ReachView } from "./ReachView";
import { ReportView } from "./ReportView";
import { IndexView } from "./IndexView";
import { NationalView } from "./NationalView";

/**
 * 五器之門。一門而已,故五器同為一chunk。
 *
 * ── 何以合而不分 ─────────────────────────────────────────────────────
 *
 * 分之於每器,則其chunk五,而易一tab即一取 —— 於弱網,其待可見。
 * 此器所事者,人在暑中而欲速得其答;易tab而待者,正其所不可。
 * 且五器所共者眾(leaflet、ajv、sql.js、motion),分之則其共者別為一chunk,
 * 而其取之次數反增。
 *
 * 合之,則入其器之首取稍重,而其後易tab皆無所待。
 *
 * ONE chunk for all five views, deliberately not one per view. Per-view chunks
 * would make every tab switch a network fetch — and the person this is for is
 * on a phone, in heat, wanting a fast answer. They share most of their weight
 * anyway (leaflet, ajv, sql.js, motion), so splitting them mostly produces a
 * shared chunk plus five thin ones and MORE round trips, not fewer bytes.
 *
 * 其界在此,不在其器之間:landing 與此器所用者本不相及 ——
 * landing 不引 leaflet,不引 loadCityPack,故其人不當載之。
 * The real boundary is landing-versus-tool: the landing imports neither leaflet
 * nor the pack loader, so a visitor who only reads it should not be sent them.
 */
export default function AppViews({
  view, city, onPickCity,
}: {
  view: "route" | "reach" | "report" | "index" | "national";
  city: string;
  onPickCity: (id: string) => void;
}) {
  // key={city} —— 易城則其器重立,不留前城之狀。
  switch (view) {
    case "route": return <RouteView key={city} cityId={city} />;
    case "reach": return <ReachView key={city} cityId={city} />;
    case "report": return <ReportView key={city} cityId={city} />;
    case "index": return <IndexView key={city} cityId={city} />;
    case "national": return <NationalView onPickCity={onPickCity} />;
  }
}
