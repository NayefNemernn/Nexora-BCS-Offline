import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { getExpenses, getExpenseSummary, createExpense, updateExpense, deleteExpense } from "../controllers/expense.controller.js";

const router = express.Router();
router.get("/",          protect, isAdmin, getExpenses);
router.get("/summary",   protect, isAdmin, getExpenseSummary);
router.post("/",         protect, isAdmin, createExpense);
router.put("/:id",       protect, isAdmin, updateExpense);
router.delete("/:id",    protect, isAdmin, deleteExpense);
export default router;