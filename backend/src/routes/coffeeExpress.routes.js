import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { getCoffeeExpressStatus, unlockCoffeeExpress } from "../controllers/coffeeExpress.controller.js";

const router = express.Router();
router.use(protect);

router.get("/status",  getCoffeeExpressStatus);
router.post("/unlock", isAdmin, unlockCoffeeExpress);

export default router;
