import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { getPromos, createPromo, updatePromo, deletePromo } from "../controllers/promo.controller.js";

const router = express.Router();

router.get("/",      protect, isAdmin, getPromos);
router.post("/",     protect, isAdmin, createPromo);
router.put("/:id",   protect, isAdmin, updatePromo);
router.delete("/:id",protect, isAdmin, deletePromo);

export default router;
