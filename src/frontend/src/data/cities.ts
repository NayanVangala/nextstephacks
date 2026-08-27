/** 所備之城。囊在 public/city-packs/<id>.json。 */
export interface 城 {
  id: string;
  label: string;
}

export const CITIES: 城[] = [
  { id: "la", label: "Los Angeles" },
  { id: "sea", label: "Seattle" },
];

export const 預設之城 = "la";
