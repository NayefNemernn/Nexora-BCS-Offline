import express from "express";
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customer.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/",     protect, getCustomers);
router.get("/:id",  protect, getCustomerById);
router.post("/",    protect, createCustomer);
router.put("/:id",  protect, updateCustomer);
router.delete("/:id", protect, deleteCustomer);

export default router;