/* ================================================================
   offlineDB.js  —  Central IndexedDB manager for Market POS

   Stores:
     pending_sales     → queued sales waiting to sync
     pending_returns   → queued returns waiting to sync
     pending_expenses  → queued expenses waiting to sync
     products_cache    → cached product list for offline POS
     categories_cache  → cached categories
     customers_cache   → cached customers
     settings_cache    → cached store settings + misc
     auth              → JWT token for SW background sync
================================================================ */

const DB_NAME    = "pos_offline_db";
const DB_VERSION = 5;

const PENDING_STORES = ["pending_sales", "pending_returns", "pending_expenses", "pending_mutations"];
const CACHE_STORES   = ["products_cache", "categories_cache", "customers_cache", "settings_cache", "auth"];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      PENDING_STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
      });
      CACHE_STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { keyPath: "key" });
      });
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/* ── Generic helpers ────────────────────────────────────────── */
async function put(store, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const r  = tx.objectStore(store).put(record);
    r.onsuccess  = () => resolve(r.result);
    tx.onerror   = () => reject(tx.error);
  });
}

async function add(store, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const r  = tx.objectStore(store).add(record);
    r.onsuccess  = () => resolve(r.result);
    tx.onerror   = () => reject(tx.error);
  });
}

async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const r  = tx.objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror   = () => reject(r.error);
  });
}

async function getOne(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const r  = tx.objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result ?? null);
    r.onerror   = () => reject(r.error);
  });
}

async function remove(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

/* ── Auth token ─────────────────────────────────────────────── */
export const saveToken  = (token) => put("auth", { key: "token", value: token });
export const clearToken = ()      => remove("auth", "token");

/* ── Products cache ─────────────────────────────────────────── */
export const cacheProducts     = (data)  => put("products_cache", { key: "list", data, cachedAt: Date.now() });
export const getCachedProducts = async () => (await getOne("products_cache", "list"))?.data ?? null;
export const getProductsCacheAge = async () => {
  const rec = await getOne("products_cache", "list");
  return rec ? Date.now() - rec.cachedAt : null;
};

/* Decrement stock locally for offline sales */
export async function decrementLocalStock(items) {
  const cached = await getCachedProducts();
  if (!cached || !items?.length) return;
  const updated = cached.map((p) => {
    const sold = items.find((i) => i.productId === p._id || i.productId === p._id?.toString());
    return sold ? { ...p, stock: Math.max(0, (p.stock || 0) - sold.quantity) } : p;
  });
  await cacheProducts(updated);
}

/* ── Categories cache ───────────────────────────────────────── */
export const cacheCategories     = (data) => put("categories_cache", { key: "list", data, cachedAt: Date.now() });
export const getCachedCategories = async () => (await getOne("categories_cache", "list"))?.data ?? null;

/* ── Customers cache ────────────────────────────────────────── */
export const cacheCustomers     = (data) => put("customers_cache", { key: "list", data, cachedAt: Date.now() });
export const getCachedCustomers = async () => (await getOne("customers_cache", "list"))?.data ?? null;

/* ── Settings cache ─────────────────────────────────────────── */
export const cacheSettings     = (data) => put("settings_cache", { key: "store", data, cachedAt: Date.now() });
export const getCachedSettings = async () => (await getOne("settings_cache", "store"))?.data ?? null;

/* ── Generic key-value in settings_cache ────────────────────── */
export const cacheByKey    = (key, data) => put("settings_cache", { key, data, cachedAt: Date.now() });
export const getCachedByKey = async (key) => (await getOne("settings_cache", key))?.data ?? null;

/* ── Pending sales ──────────────────────────────────────────── */
export const queueSale         = (data) => add("pending_sales", { ...data, savedAt: new Date().toISOString() });
export const getPendingSales   = ()     => getAll("pending_sales");
export const deletePendingSale = (id)   => remove("pending_sales", id);
export const getPendingSaleCount = async () => (await getPendingSales()).length;

/* ── Pending returns ────────────────────────────────────────── */
export const queueReturn         = (data) => add("pending_returns", { ...data, savedAt: new Date().toISOString() });
export const getPendingReturns   = ()     => getAll("pending_returns");
export const deletePendingReturn = (id)   => remove("pending_returns", id);

/* ── Pending expenses ───────────────────────────────────────── */
export const queueExpense         = (data) => add("pending_expenses", { ...data, savedAt: new Date().toISOString() });
export const getPendingExpenses   = ()     => getAll("pending_expenses");
export const deletePendingExpense = (id)   => remove("pending_expenses", id);

/* ── PayLater cache ─────────────────────────────────────────── */
export const cachePayLater     = (data) => cacheByKey("paylater_list", data);
export const getCachedPayLater = ()     => getCachedByKey("paylater_list");

/* ── Pending mutations (generic queue) ──────────────────────── */
export const queueMutation         = (type, endpoint, method, body = null) =>
  add("pending_mutations", { type, endpoint, method, body, savedAt: new Date().toISOString() });
export const getPendingMutations   = () => getAll("pending_mutations");
export const deletePendingMutation = (id) => remove("pending_mutations", id);
