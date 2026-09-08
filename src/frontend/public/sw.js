/*
  離網之工。

  此站或在 /nextstephacks/ 之下,或在其根 —— 故一切以其 scope 為準,
  不書絕對之路。registration.scope 者,sw.js 所在之處也。
  Everything is resolved against registration scope rather than an absolute
  path, because the same file is served from /nextstephacks/ on Pages and from
  / on Vercel and Cloudflare.

  ── 三途,其別在其害 ──────────────────────────────────────────────────

  一、文之求(navigate):先網而後記。
     其名不隨其build而易,故記之為先者,一部署之後猶見其舊 —— 而demo之際
     見舊碼者,無以自知。故必先網;網不通乃取其記,是為離網之用。

  二、囊與資(/assets/、/city-packs/):先記而後網。
     assets 之名帶其hash,一改則其名亦改,故其記必不陳。
     囊之名不帶hash,然其 _headers 已 immutable —— 瀏覽器本已永記之,
     故此記不增其害。

  三、其餘皆不記:瓦、天氣、警、量之script,皆直達於網。
     第三方之物入其記,則一日之後所見者非其實 —— 熱警尤不可記,
     其陳者可令人以為無警。

  MUST be network-first for navigations: index.html keeps its name across
  builds, so a cache-first shell would serve last week's JavaScript after a
  deploy with nothing on screen to say so. Hashed assets are cache-first
  because a changed file has a changed URL. Everything else — map tiles,
  weather, NWS alerts, analytics — is never cached: a stale heat alert would
  tell a heat-sensitive person the coast is clear on a day nobody checked.
*/

const 記之名 = "passable-v1";
const 域 = new URL(self.registration.scope);

self.addEventListener("install", () => {
  // 不預記。其資之名帶 hash,而其表在其build之中,此處不可知之;
  // 且首載之後自入其記,故預記者但增其一次之費。
  self.skipWaiting();
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    (async () => {
      for (const k of await caches.keys()) {
        if (k !== 記之名) await caches.delete(k);
      }
      await self.clients.claim();
    })(),
  );
});

/** 可記者:同域,且在 assets 或 city-packs 之下。 */
function 可記(url) {
  if (url.origin !== 域.origin) return false;
  const 內 = url.pathname.startsWith(域.pathname);
  if (!內) return false;
  const 餘 = url.pathname.slice(域.pathname.length);
  return 餘.startsWith("assets/") || 餘.startsWith("city-packs/");
}

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 一、文之求。先網,敗則取其記,再敗則取其 index —— hash 之路皆歸於一文。
  if (req.mode === "navigate") {
    ev.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const c = await caches.open(記之名);
          c.put(域.pathname, res.clone());
          return res;
        } catch {
          return (
            (await caches.match(域.pathname)) ??
            (await caches.match(req)) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // 二、資與囊。先記。
  if (可記(url)) {
    ev.respondWith(
      (async () => {
        const 有 = await caches.match(req);
        if (有) return 有;
        const res = await fetch(req);
        // 二百者乃記之。四百、五百入其記,則其誤永存。
        if (res.ok) (await caches.open(記之名)).put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // 三、其餘不預其事 —— 直達於網。
});
