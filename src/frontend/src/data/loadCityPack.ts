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

/**
 * 解其壓而析之。
 *
 * 囊存於盤為 gzip,而其至此或已解 —— 諸站之待 .gz 者不一:或標之以
 * Content-Encoding: gzip,則道上自解之(vite preview 即如是);或但以八位
 * 之流付之。故不可以其名斷之,當以其首二字斷之 —— 1f 8b 者,gzip 之印。
 *
 * Host-dependent, and the filename cannot tell us which happened. Some servers
 * label .json.gz with Content-Encoding: gzip, so fetch transparently inflates
 * it and hands us plain JSON (Vite's preview server does exactly this). Others
 * serve the raw octets untouched. Sniffing the gzip magic number is correct
 * under both; trusting the extension is reliably correct under neither.
 *
 * 全取而後斷。本須全析之為一文,故不流無所損。
 * Buffering instead of streaming costs nothing here — the whole pack must be
 * parsed as a single JSON document either way.
 */
async function 解而析(res: Response): Promise<unknown> {
  const buf = new Uint8Array(await res.arrayBuffer());

  // 道上已解者,直析之。此非退路,乃受其所惠 —— 站自解之,則其解在原生之
  // 碼,無需再勞於 JS。
  // Not a fallback but a free ride: when the host inflates for us, the work
  // happened in native code and there is nothing left to do.
  if (buf[0] !== 0x1f || buf[1] !== 0x8b) {
    return JSON.parse(new TextDecoder().decode(buf));
  }

  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "This browser cannot decompress the map data. " +
        "Passable needs Safari 16.4+, Chrome 103+, or Firefox 113+.",
    );
  }
  const 流 = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(流).json();
}

async function fetchAndValidate(id: string, fetchFn: FetchFn): Promise<CityPack> {
  // BASE_URL 之故:站或在 /nextstephacks/ 之下,絕對之路則四百。
  const 基 = import.meta.env.BASE_URL ?? "/";
  const res = await fetchFn(`${基}city-packs/${id}.json.gz`);
  // 必先驗其應,而後解。四百者其身為 HTML,直付 gunzip 則其誤言「壞流」,
  // 而其實為無此囊 —— 誤之文當言其所以然。
  // MUST check before decompressing: a 404 body is HTML, and feeding that to
  // the gunzip stream reports a corrupt-stream error instead of a missing pack.
  if (!res.ok) throw new Error(`city pack ${id}: HTTP ${res.status}`);
  const data = await 解而析(res);
  if (!validate(data)) {
    throw new Error(`invalid city pack: ${ajv.errorsText(validate.errors)}`);
  }
  return data as unknown as CityPack;
}
