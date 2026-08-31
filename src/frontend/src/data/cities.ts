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
];

export const 預設之城 = "la";
