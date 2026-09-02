/** 所備之城。囊在 public/city-packs/<id>.json。 */
export interface 城 {
  id: string;
  label: string;
}

export const CITIES: 城[] = [
  { id: "la", label: "Los Angeles" },
  { id: "sea", label: "Seattle" },
  // 鳳凰城:全美大城之最暑者,而其樓高之籤,九成有一為推(百之九一點四)。
  // 其推之比本為十六城之最,而綠灣(九八點四)、奧蘭多(九二點九)後至而過之 ——
  // 故此註亦改。所推之比,今各城自著於其面,不可於此預言之。
  // Shade here is 91.4% inferred. That is not a reason to hide it — the hatch
  // pattern and the footer's own inferred-share warning make the uncertainty
  // visible, and a city that needs shade modelling this badly while publishing
  // this little data is the finding, not a defect to be smoothed over.
  { id: "phx", label: "Phoenix" },
  // 四大城。其資之厚薄不一 —— 界面自著其所推之比,不必於此預言之。
  { id: "nyc", label: "New York" },
  { id: "chi", label: "Chicago" },
  { id: "sfo", label: "San Francisco" },
  { id: "mia", label: "Miami" },
  /*
    續九城。其框皆取市心約三公里見方,與上同 —— 故其量可比。
    Nine more downtowns at the same ~3 km footprint as the originals, so the
    figures stay comparable across cities. Green Bay and Bellevue are here on
    purpose: the argument is not only about the hottest or largest places.
  */
  { id: "bel", label: "Bellevue" },
  { id: "grb", label: "Green Bay" },
  { id: "bna", label: "Nashville" },
  { id: "mem", label: "Memphis" },
  { id: "stl", label: "St. Louis" },
  { id: "dal", label: "Dallas" },
  { id: "hou", label: "Houston" },
  { id: "mco", label: "Orlando" },
  { id: "bos", label: "Boston" },
  /*
    續二十二城,至三十八。其框皆二點五乘二點一公里,約五點二方公里 ——
    與前十六者之中數同,故其數可比,不至以框之大小為城之優劣。

    ── 何以止於此數 ──────────────────────────────────────────────────
    囊之重,城各七八兆,三十八城已二百五十兆。GitHub Pages 一站約止於一千兆,
    而其重亦盡入 git 之史,不可復去。全美之邑一萬九千有奇,盡納之則十五萬兆,
    逾其限千二百倍 —— 非多寡之差,乃可否之别。
    Twenty-two more at the same ~5.2 km footprint, so the figures stay
    comparable. This is a hosting ceiling, not a preference: 38 packs is 251 MB
    against GitHub Pages' ~1 GB, and every byte also lands in git history. All
    ~19,500 US places would be ~153 GB.

    其框皆市心 —— 非其市之全。此界,limits 一頁明言之。
    Each is a downtown core, not the whole city; the Limits page says so.
  */
  { id: "atl", label: "Atlanta" },
  { id: "aus", label: "Austin" },
  { id: "bal", label: "Baltimore" },
  { id: "clt", label: "Charlotte" },
  { id: "cle", label: "Cleveland" },
  { id: "cmh", label: "Columbus" },
  { id: "den", label: "Denver" },
  { id: "det", label: "Detroit" },
  { id: "ind", label: "Indianapolis" },
  { id: "mci", label: "Kansas City" },
  { id: "las", label: "Las Vegas" },
  { id: "mke", label: "Milwaukee" },
  { id: "msp", label: "Minneapolis" },
  { id: "msy", label: "New Orleans" },
  { id: "phl", label: "Philadelphia" },
  { id: "pit", label: "Pittsburgh" },
  { id: "pdx", label: "Portland" },
  { id: "smf", label: "Sacramento" },
  { id: "slc", label: "Salt Lake City" },
  { id: "sat", label: "San Antonio" },
  { id: "san", label: "San Diego" },
  { id: "dca", label: "Washington, DC" },
];

export const 預設之城 = "la";
