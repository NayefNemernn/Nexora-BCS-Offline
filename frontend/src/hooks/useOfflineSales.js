import { isOnline } from "../lib/connectivity";
import { useEffect, useCallback } from "react";
import { createSale } from "../api/sale.api";
import { returnSale  } from "../api/sale.api";
import api from "../api/axios";
import {
  queueSale, getPendingSales, deletePendingSale, getPendingSaleCount,
  queueReturn, getPendingReturns, deletePendingReturn,
  queueExpense, getPendingExpenses, deletePendingExpense,
  saveToken, decrementLocalStock,
  queueMutation, getPendingMutations, deletePendingMutation,
} from "../lib/offlineDB";
import toast from "react-hot-toast";

export default function useOfflineSales() {

  /* ── keep auth token synced into IDB for SW background sync ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) saveToken(token).catch(() => {});
  }, []);

  /* ── listen for SW messages (background sync success) ──────── */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = (e) => {
      if (e.data?.type === "SYNC_SALE_SUCCESS") {
        window.dispatchEvent(new Event("offlineSynced"));
      }
      if (e.data?.type === "SYNC_COMPLETE") {
        const synced = e.data?.synced || 0;
        if (synced > 0) toast.success(`✅ ${synced} offline record(s) synced!`);
        window.dispatchEvent(new Event("offlineSynced"));
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  /* ── saveOffline: queue a sale to IndexedDB ─────────────────── */
  const saveOffline = useCallback(async (saleData) => {
    await queueSale(saleData);
    /* decrement local stock cache so subsequent offline sales see updated quantities */
    await decrementLocalStock(saleData.items).catch(() => {});

    /* Try to register a background sync (Chrome/Android) */
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register("pos-sync-sales");
      } catch { /* SyncManager not always available */ }
    }
  }, []);

  /* ── saveReturnOffline: queue a return ──────────────────────── */
  const saveReturnOffline = useCallback(async (saleId, returnData) => {
    await queueReturn({ saleId, ...returnData });
  }, []);

  /* ── saveExpenseOffline: queue an expense ───────────────────── */
  const saveExpenseOffline = useCallback(async (expenseData) => {
    await queueExpense(expenseData);
  }, []);

  /* ── getPendingCount ────────────────────────────────────────── */
  const getPendingCount = useCallback(async () => {
    const sales    = await getPendingSaleCount();
    const returns  = (await getPendingReturns()).length;
    const expenses = (await getPendingExpenses()).length;
    const mutations = (await getPendingMutations()).length;
    return sales + returns + expenses + mutations;
  }, []);

  /* ── sync: manual drain of both queues ─────────────────────── */
  const sync = useCallback(async () => {
    if (!isOnline()) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    /* sync pending sales */
    const pendingSales = await getPendingSales();
    for (const sale of pendingSales) {
      try {
        const { id, savedAt, ...saleData } = sale;
        await createSale(saleData);
        await deletePendingSale(id);
        synced++;
      } catch (err) {
        console.error("[Sync] Sale failed:", err.response?.data || err.message);
        failed++;
      }
    }

    /* sync pending returns */
    const pendingReturns = await getPendingReturns();
    for (const ret of pendingReturns) {
      try {
        const { id, savedAt, saleId, ...returnData } = ret;
        await returnSale(saleId, returnData);
        await deletePendingReturn(id);
        synced++;
      } catch (err) {
        console.error("[Sync] Return failed:", err.response?.data || err.message);
        failed++;
      }
    }

    /* sync pending expenses */
    const pendingExpenses = await getPendingExpenses();
    for (const exp of pendingExpenses) {
      try {
        const { id, savedAt, ...expData } = exp;
        await api.post("/expenses", expData);
        await deletePendingExpense(id);
        synced++;
      } catch (err) {
        console.error("[Sync] Expense failed:", err.response?.data || err.message);
        failed++;
      }
    }

    /* sync pending mutations — delete FIRST to prevent double-execution */
    const pendingMutations = await getPendingMutations();
    for (const mut of pendingMutations) {
      const { id, type, endpoint, method, body } = mut;
      await deletePendingMutation(id).catch(() => {});

      /* drop mutations whose URL contains an offline ID — the item only ever
         existed locally so there is nothing to do on the server */
      if (endpoint.includes("/offline-")) {
        synced++;
        continue;
      }

      try {
        const url = endpoint.startsWith("/api") ? endpoint.slice(4) : endpoint;

        /* resolve offline supplierId → real ID by looking up supplier name */
        let resolvedBody = body;
        if (type === "create_purchase_order" && body?.supplierId?.toString().startsWith("offline-")) {
          const suppRes = await api.get("/suppliers").catch(() => null);
          const real = suppRes?.data?.find(s => s.name === body.supplierName);
          resolvedBody = { ...body, supplierId: real?._id || null };
        }

        await api.request({ url, method: method || "POST", data: resolvedBody || undefined });
        synced++;
      } catch (err) {
        console.error("[Sync] Mutation failed:", type, err.response?.data || err.message);
        await queueMutation(type, endpoint, method, body).catch(() => {});
        failed++;
      }
    }

    return { synced, failed };
  }, []);

  return { saveOffline, saveReturnOffline, saveExpenseOffline, sync, getPendingCount };
}