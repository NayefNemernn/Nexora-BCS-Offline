import express from "express";
import {
  createHoldSale, getHoldSales, getHoldSaleNames,
  payHoldSale, updateHoldCustomer, deleteHoldSale,
  getRecentPayments, paymentsThisMonth,
  getCustomerPayments, getCustomerInvoices, updateCreditLimit,
} from "../controllers/holdSale.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
router.use(protect);

router.get("/names",                   getHoldSaleNames);
router.get("/payments/recent",         getRecentPayments);
router.get("/payments/month",          paymentsThisMonth);
router.get("/payments/customer/:name", getCustomerPayments);
router.get("/invoices/:name",          getCustomerInvoices);

router.get("/",    getHoldSales);
router.post("/",   createHoldSale);

router.post("/:id/pay",     payHoldSale);
router.put("/:id/customer", updateHoldCustomer);
router.patch("/:id/limit",  updateCreditLimit);
router.delete("/:id",       deleteHoldSale);

export default router;