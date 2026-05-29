import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { getAdminOffers, createOffer, updateOffer, deleteOffer } from "../controllers/pointsOffer.controller.js";

const router = express.Router();

router.get("/",      protect, isAdmin, getAdminOffers);
router.post("/",     protect, isAdmin, createOffer);
router.put("/:id",   protect, isAdmin, updateOffer);
router.delete("/:id",protect, isAdmin, deleteOffer);

export default router;
