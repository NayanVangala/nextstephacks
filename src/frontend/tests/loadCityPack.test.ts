import { describe, it, expect, vi } from "vitest";
import { loadCityPack } from "../src/data/loadCityPack";

const validPack = {
  manifest: {
    id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
    hour_buckets: [12], generated_at: "x",
  },
  nodes: [{ id: 1, lon: 0, lat: 0 }],
  edges: [{
    id: 1, from: 1, to: 2, length_m: 1, geometry: [[0, 0], [1, 1]],
    is_steps: false, is_crossing: false, confidence: "high",
    sun_exposure: [0.5],
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
  }],
};

/*
  取者付八位之身,不付其物 —— 若但付 json(),則所試者非所行者,而解壓之路
  終不見驗。二身皆須試之:壓者與已解者。站之待 .gz 者不一,二路皆真行之路。

  The fake serves raw octets rather than stubbing json(), so the decompression
  branch is actually exercised. BOTH shapes must be tested: some hosts hand back
  gzip bytes, others set Content-Encoding and inflate transparently. Neither is
  hypothetical — Vite's preview server does the latter.
*/
const 應之以 = (bytes: Uint8Array) =>
  async () =>
    ({
      ok: true,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    }) as unknown as Response;

const 壓 = async (body: unknown) =>
  new Uint8Array(
    await new Response(
      new Blob([JSON.stringify(body)]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );

const 生 = (body: unknown) => new TextEncoder().encode(JSON.stringify(body));

describe("loadCityPack", () => {
  it("returns a validated pack from gzip bytes", async () => {
    const pack = await loadCityPack("t", 應之以(await 壓(validPack)));
    expect(pack.edges[0].traversable.wheelchair).toBe(true);
  });

  // 站自解之者。首二字非 1f 8b,則不可再解,直析之而已。
  it("returns a validated pack when the host already inflated it", async () => {
    const pack = await loadCityPack("t", 應之以(生(validPack)));
    expect(pack.edges[0].traversable.wheelchair).toBe(true);
  });

  it("throws on a schema-invalid pack", async () => {
    const bad = structuredClone(validPack);
    (bad.edges[0] as Record<string, unknown>).confidence = "great";
    await expect(loadCityPack("t", 應之以(await 壓(bad)))).rejects.toThrow();
  });

  // 四百之身為 HTML。若不先驗其應而直解之,則其誤言「壞流」,
  // 而其實為無此囊 —— 誤之文當指其所以然。
  it("names a missing pack rather than reporting a corrupt gzip stream", async () => {
    const 四百 = async () =>
      ({ ok: false, status: 404 }) as unknown as Response;
    await expect(loadCityPack("nope", 四百)).rejects.toThrow(/city pack nope: HTTP 404/);
  });

  // 舊器無 DecompressionStream。其敗當有其名,不當令圖空白而無言。
  // 然此唯壓者為然 —— 站已解之,則舊器亦可用,故不當阻之。
  it("tells an old browser what it lacks instead of rendering a blank map", async () => {
    const 壓之身 = await 壓(validPack);
    vi.stubGlobal("DecompressionStream", undefined);
    try {
      await expect(loadCityPack("t", 應之以(壓之身)))
        .rejects.toThrow(/cannot decompress the map data/);
      // 已解之身不賴其器,故舊器亦當得之。
      const pack = await loadCityPack("t", 應之以(生(validPack)));
      expect(pack.manifest.id).toBe("t");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
