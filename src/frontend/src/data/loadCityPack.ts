import Ajv from "ajv";
import schema from "../../../shared/schema/city-pack.schema.json";
import type { CityPack } from "../types";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

type FetchFn = (url: string) => Promise<Response>;

// 囊重逾八兆,不可再取。StrictMode 於開發時兩發其效,故必記之。
const inFlight = new Map<string, Promise<CityPack>>();

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
  inFlight.set(id, p);
  return p;
}

async function fetchAndValidate(id: string, fetchFn: FetchFn): Promise<CityPack> {
  // BASE_URL 之故:站或在 /nextstephacks/ 之下,絕對之路則四百。
  const 基 = import.meta.env.BASE_URL ?? "/";
  const res = await fetchFn(`${基}city-packs/${id}.json`);
  const data = await res.json();
  if (!validate(data)) {
    throw new Error(`invalid city pack: ${ajv.errorsText(validate.errors)}`);
  }
  return data as unknown as CityPack;
}
