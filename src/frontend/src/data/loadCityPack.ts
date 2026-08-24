import Ajv from "ajv";
import schema from "../../../shared/schema/city-pack.schema.json";
import type { CityPack } from "../types";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

type FetchFn = (url: string) => Promise<Response>;

/**
 * 取城囊而驗之。
 *
 * Validation is not optional: a malformed pack would route someone down a
 * street the data never vouched for. Fail loudly instead.
 */
export async function loadCityPack(
  id: string,
  fetchFn: FetchFn = (u) => fetch(u),
): Promise<CityPack> {
  const res = await fetchFn(`/city-packs/${id}.json`);
  const data = await res.json();
  if (!validate(data)) {
    throw new Error(`invalid city pack: ${ajv.errorsText(validate.errors)}`);
  }
  return data as unknown as CityPack;
}
