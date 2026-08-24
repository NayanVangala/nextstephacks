type FetchFn = (url: string) => Promise<Response>;

// 洛城常年之暑,取其保守者。網斷時用之,而必告以「估」。
const SEASONAL_NORMAL_C = 24;

/**
 * 取當下體感之溫。
 *
 * On any failure the caller gets a usable number AND `estimated: true`. The
 * flag is not decoration — the UI must say the temperature is a guess, because
 * a heat-sensitive user deciding whether to make a trip deserves to know the
 * routing was done against a fallback rather than live conditions.
 */
export async function fetchCurrentTempC(
  lat: number,
  lon: number,
  fetchFn: FetchFn = (u) => fetch(u),
): Promise<{ tempC: number; estimated: boolean }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=apparent_temperature`;
  try {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const t = data?.current?.apparent_temperature;
    if (typeof t !== "number") throw new Error("no apparent_temperature");
    return { tempC: t, estimated: false };
  } catch {
    return { tempC: SEASONAL_NORMAL_C, estimated: true };
  }
}
