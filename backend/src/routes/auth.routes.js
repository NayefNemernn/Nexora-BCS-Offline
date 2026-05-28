import express from "express";
import { login, logout, register, getUsers, changePassword } from "../controllers/auth.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.post("/register", register);   // creates store + admin together
router.post("/login",    login);

// Protected
router.post("/logout",          protect,          logout);
router.get( "/users",           protect,          getUsers);         // cashiers in same store
router.post("/change-password", protect, isAdmin, changePassword);

export default router;