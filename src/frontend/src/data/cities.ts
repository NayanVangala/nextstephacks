/** 所備之城。囊在 public/city-packs/<id>.json。 */
export interface 城 {
  id: string;
  label: string;
}

export const CITIES: 城[] = [
  { id: "la", label: "Los Angeles" },
  { id: "sea", label: "Seattle" },
  // 鳳凰城:全美大城之最暑者,而其樓高之籤,九成有一為推。
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
];

export const 預設之城 = "la";
