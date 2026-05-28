/* ================================================================
   MARKET POS — Service Worker  v7
   Precaching  → vite-plugin-pwa injects the asset manifest
   App shell   → Cache First
   API GET     → Stale-While-Revalidate (IDB fallback)
   API POST    → Network → queue to IDB on failure
   Sync        → drain pending_sales / pending_returns on reconnect
================================================================ */

const CACHE_VERSION = "v7";
const SHELL_CACHE   = `pos-shell-${CACHE_VERSION}`;
const API_CACHE     = `pos-api-${CACHE_VERSION}`;
const SYNC_TAG      = "pos-sync-sales";

/* injected by vite-plugin-pwa at build time */
const PRECACHE_MANIFEST = self.__WB_MANIFEST;

const STATIC_SHELL = [
  "/", "/index.html", "/manifest.json",
  "/icon-192.png", "/icon-512.png",
  "/placeholder.png", "/notification.mp3",
  "/products_import_template.xlsx",
];

/* ── Install: precache everything ──────────────────────────── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      const manifestUrls = PRECACHE_MANIFEST.map((entry) =>
        typeof entry === "string" ? entry : entry.url
      );
      const all = [...new Set([...STATIC_SHELL, ...manifestUrls])];
      return cache.addAll(all).catch((err) =>
        console.warn("[SW] Precache partial failure:", err)
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ────────────────────────────── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: routing strategy ────────────────────────────────── */
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (!url.protocol.startsWith("http")) return;

  const isAPI        = url.pathname.startsWith("/api/");
  const isNavigation = request.mode === "navigate";

  /* Navigation → always serve index.html */
  if (isNavigation) {
    e.respondWith(
      caches.match("/index.html", { cacheName: SHELL_CACHE })
        .then((c) => c || fetch(request))
    );
    return;
  }

  /* Static assets → cache first, network fallback, then cache it */
  if (!isAPI) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok && res.type !== "opaque") {
            caches.open(SHELL_CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        }).catch(() =>
          new Response("Offline", { status: 503 })
        );
      })
    );
    return;
  }

  /* API GET → stale-while-revalidate */
  if (request.method === "GET") {
    e.respondWith(
      caches.open(API_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fresh = fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => null);
          return cached || fresh || new Response(
            JSON.stringify({ error: "Offline", cached: false }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        })
      )
    );
    return;
  }

  /* API POST/PATCH/DELETE → network only */
});

/* ── Background Sync ────────────────────────────────────────── */
self.addEventListener("sync", (e) => {
  if (e.tag === SYNC_TAG) e.waitUntil(syncAll());
});

async function syncAll() {
  const db    = await openDB();
  const token = await getToken(db);
  const hdrs  = {
    "Content-Type":  "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
  };
  let synced = 0;

  /* pending sales */
  for (const sale of await getAllRecords(db, "pending_sales")) {
    try {
      const { id, savedAt, ...data } = sale;
      const res = await fetch("/api/sales", { method: "POST", headers: hdrs, body: JSON.stringify(data) });
      if (res.ok) {
        await deleteRecord(db, "pending_sales", id);
        synced++;
        broadcast({ type: "SYNC_SALE_SUCCESS", sale: data });
      }
    } catch {}
  }

  /* pending returns */
  if (db.objectStoreNames.contains("pending_returns")) {
    for (const ret of await getAllRecords(db, "pending_returns")) {
      try {
        const { id, savedAt, saleId, ...data } = ret;
        const res = await fetch(`/api/sales/${saleId}/return`, { method: "POST", headers: hdrs, body: JSON.stringify(data) });
        if (res.ok) {
          await deleteRecord(db, "pending_returns", id);
          synced++;
        }
      } catch {}
    }
  }

  /* pending expenses */
  if (db.objectStoreNames.contains("pending_expenses")) {
    for (const exp of await getAllRecords(db, "pending_expenses")) {
      try {
        const { id, savedAt, ...data } = exp;
        const res = await fetch("/api/expenses", { method: "POST", headers: hdrs, body: JSON.stringify(data) });
        if (res.ok) {
          await deleteRecord(db, "pending_expenses", id);
          synced++;
        }
      } catch {}
    }
  }

  /* pending_mutations are handled by the JS layer only (prevents double-execution) */

  if (synced > 0) broadcast({ type: "SYNC_COMPLETE", synced });
}

/* ── Message handler ────────────────────────────────────────── */
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (e.data?.type === "TRIGGER_SYNC")  syncAll();
});

/* ── Helpers ────────────────────────────────────────────────── */
function broadcast(msg) {
  self.clients.matchAll().then((clients) => clients.forEach((c) => c.postMessage(msg)));
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("pos_offline_db", 5);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      ["pending_sales", "pending_returns", "pending_expenses", "pending_mutations",
       "products_cache", "categories_cache", "customers_cache",
       "settings_cache", "auth"].forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          const opts = name.startsWith("pending_") ? { keyPath: "id", autoIncrement: true } : { keyPath: "key" };
          db.createObjectStore(name, opts);
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function getAllRecords(db, store) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function deleteRecord(db, store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

function getToken(db) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction("auth", "readonly").objectStore("auth").get("token");
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror   = () => resolve(null);
    } catch { resolve(null); }
  });
}
