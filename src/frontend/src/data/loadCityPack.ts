import Ajv from "ajv";
import schema from "../../../shared/schema/city-pack.schema.json";
import type { CityPack } from "../types";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

type FetchFn = (url: string) => Promise<Response>;

// 囊重逾八兆,不可再取。StrictMode 於開發時兩發其效,故必記之。
const inFlight = new Map<string, Promise<CityPack>>();

/*
  記之數。三十八城,其囊自二兆半至十六兆有半,若盡記之則二百五十兆之文
  皆為生物,其在堆中數倍於是 —— 一頁歷諸城而不釋,必至於崩。
  取二者:一為所視,一為所自來 —— 前後相易者最數,故二足以蔽之。

  MUST stay bounded. There are 38 packs totalling 251 MB of JSON; retaining all
  of them as live objects is several hundred MB of heap and will crash a phone
  tab. Two entries covers the common case (flipping between the city you are on
  and the one you came from) without holding the rest.
*/
const 記之數 = 2;

function 記之(id: string, p: Promise<CityPack>) {
  // Map 存其入之次第,故其首即最舊者。
  for (const k of inFlight.keys()) {
    if (inFlight.size < 記之數) break;
    inFlight.delete(k);
  }
  inFlight.set(id, p);
}

/**
 * 取城囊而驗之。
 *
 * Validation is not optional: a malformed pack would route someone down a
 * street the data never vouched for. Fail loudly instead.
 */
export async function loadCityPack(
  id: string,
  fetchFn?: FetchFn,
): Promise<CityPack> {
  // 授 fetchFn 者,試也,不入記錄,免污他試。
  if (fetchFn) return fetchAndValidate(id, fetchFn);

  const cached = inFlight.get(id);
  if (cached) return cached;

  const p = fetchAndValidate(id, (u) => fetch(u)).catch((err) => {
    inFlight.delete(id); // 敗則忘之,俾可再試
    throw err;
  });
  記之(id, p);
  return p;
}

async function fetchAndValidate(id: string, fetchFn: FetchFn): Promise<CityPack> {
  // BASE_URL 之故:站或在 /nextstephacks/ 之下,絕對之路則四百。
  const 基 = import.meta.env.BASE_URL ?? "/";
  const res = await fetchFn(`${基}city-packs/${id}.json`);
  // 必先驗其應。四百者其身為 HTML,直付 json() 則其誤言「Unexpected token '<'」,
  // 而其實為無此囊 —— 誤之文當言其所以然。
  // MUST check before parsing: a 404 body is HTML, and feeding it to json()
  // reports a syntax error instead of a missing pack.
  if (!res.ok) throw new Error(`city pack ${id}: HTTP ${res.status}`);
  const data = await res.json();
  if (!validate(data)) {
    throw new Error(`invalid city pack: ${ajv.errorsText(validate.errors)}`);
  }
  return data as unknown as CityPack;
}
