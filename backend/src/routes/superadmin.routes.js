import express from "express";
import { protect, isSuperAdmin } from "../middleware/auth.middleware.js";
import {
  getKeyStatus, setupPrivateKey, createLicense, listLicenses,
  downloadLicense, renewLicenseRecord, addDeviceToLicense,
  deleteLicenseRecord, updateLicenseNotes, getMacInfo,
} from "../controllers/licenseAdmin.controller.js";
import {
  getAllStores, getStoreDetails, createStore, deleteStore,
  updateStorePlan, toggleStoreActive, toggleCafeEnabled, resetAdminPassword,
  createCashier, impersonateStore, sendNotification,
  bulkNotify, bulkAction, transferOwner, cloneStore,
  exportStores, getPlatformAuditLog, updateStoreNotes,
  setWelcomeMessage, getActivityFeed, updateSuperAdminProfile, getSuperAdminProfile,
  getSuperAdminTelegramChatId,
  getPlatformStats, createSuperAdmin,
  getStoreUsers, createStoreUser, updateStoreUser,
  deleteStoreUser, forceLogoutStoreUser, forceLogoutStoreDevice,
  changeStoreUserPassword, getStoreGlobalStats, getStoreUserSales,
  clearStoreUserSales, clearStoreUserProducts,
  getCafeStaff, createCafeStaffByAdmin, updateCafeStaffByAdmin, deleteCafeStaffByAdmin,
  copyProductsToStore, kickSuperAdminDevice,
  getStoreLicense, removeLicenseDevice,
} from "../controllers/superadmin.controller.js";

const router = express.Router();

// One-time setup
router.post("/create", createSuperAdmin);

// All other routes require superadmin
router.use(protect, isSuperAdmin);

router.get("/stats",                         getPlatformStats);
router.get("/activity",                      getActivityFeed);
router.get("/audit",                         getPlatformAuditLog);
router.get("/export",                        exportStores);
router.get("/profile",                       getSuperAdminProfile);
router.put("/profile",                       updateSuperAdminProfile);
router.post("/profile/kick-device",          kickSuperAdminDevice);
router.get("/profile/telegram-chat-id",      getSuperAdminTelegramChatId);

router.get("/stores",                        getAllStores);
router.post("/stores",                       createStore);
router.post("/stores/bulk-action",           bulkAction);
router.post("/stores/bulk-notify",           bulkNotify);

router.get("/stores/:id",                    getStoreDetails);
router.delete("/stores/:id",                 deleteStore);
router.put("/stores/:id/plan",               updateStorePlan);
router.put("/stores/:id/toggle",             toggleStoreActive);
router.put("/stores/:id/toggle-cafe",        toggleCafeEnabled);
router.put("/stores/:id/reset-password",     resetAdminPassword);
router.post("/stores/:id/cashier",           createCashier);
router.post("/stores/:id/impersonate",       impersonateStore);
router.post("/stores/:id/notify",            sendNotification);
router.put("/stores/:id/notes",              updateStoreNotes);
router.put("/stores/:id/welcome",            setWelcomeMessage);
router.post("/stores/:id/transfer",          transferOwner);
router.post("/stores/:id/clone",             cloneStore);
router.post("/stores/:id/copy-products",     copyProductsToStore);
router.get("/stores/:id/license",            getStoreLicense);
router.delete("/stores/:id/license/devices", removeLicenseDevice);

// Store users management (superadmin only)
router.get("/stores/:id/users",                              getStoreUsers);
router.get("/stores/:id/users/stats",                        getStoreGlobalStats);
router.get("/stores/:id/cafe-staff",                         getCafeStaff);
router.post("/stores/:id/cafe-staff",                        createCafeStaffByAdmin);
router.patch("/stores/:id/cafe-staff/:staffId",              updateCafeStaffByAdmin);
router.delete("/stores/:id/cafe-staff/:staffId",             deleteCafeStaffByAdmin);
router.post("/stores/:id/users",                             createStoreUser);
router.patch("/stores/:id/users/:userId",                    updateStoreUser);
router.delete("/stores/:id/users/:userId",                   deleteStoreUser);
router.post("/stores/:id/users/:userId/force-logout",        forceLogoutStoreUser);
router.post("/stores/:id/users/:userId/force-logout-device", forceLogoutStoreDevice);
router.post("/stores/:id/users/:userId/change-password",     changeStoreUserPassword);
router.get("/stores/:id/users/:userId/sales",                getStoreUserSales);
router.delete("/stores/:id/users/:userId/clear-sales",       clearStoreUserSales);
router.delete("/stores/:id/users/:userId/clear-products",    clearStoreUserProducts);

// ── License Manager (superadmin generates & tracks all issued licenses) ───────
router.get("/licenses/key-status",             getKeyStatus);
router.get("/licenses/machine-mac",            getMacInfo);
router.post("/licenses/setup-key",             setupPrivateKey);
router.get("/licenses",                        listLicenses);
router.post("/licenses/create",                createLicense);
router.get("/licenses/:licenseId/download",    downloadLicense);
router.post("/licenses/:licenseId/renew",      renewLicenseRecord);
router.post("/licenses/:licenseId/add-device", addDeviceToLicense);
router.delete("/licenses/:licenseId",          deleteLicenseRecord);
router.put("/licenses/:licenseId/notes",       updateLicenseNotes);

export default router;