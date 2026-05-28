import express from "express";
import { getStoreInfo, getPublicProducts } from "../controllers/public.controller.js";
import {
  registerCustomer, loginCustomer,
  getProfile, updateProfile, verifyCustomer,
  getAddresses, addAddress, deleteAddress,
} from "../controllers/customerAuth.controller.js";
import { validatePromo }   from "../controllers/promo.controller.js";
import { getPublicOffers } from "../controllers/pointsOffer.controller.js";

const router = express.Router();

router.get("/:slug",          getStoreInfo);
router.get("/:slug/products", getPublicProducts);

// Customer auth
router.post("/:slug/auth/register", registerCustomer);
router.post("/:slug/auth/login",    loginCustomer);
router.get("/:slug/auth/me",        verifyCustomer, getProfile);
router.patch("/:slug/auth/me",      verifyCustomer, updateProfile);

// Saved addresses
router.get("/:slug/auth/addresses",          verifyCustomer, getAddresses);
router.post("/:slug/auth/addresses",         verifyCustomer, addAddress);
router.delete("/:slug/auth/addresses/:addrId", verifyCustomer, deleteAddress);

// Promo & points
router.post("/:slug/promo/validate", validatePromo);
router.get("/:slug/points-offers",   getPublicOffers);

export default router;
