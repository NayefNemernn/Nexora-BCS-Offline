import express from "express";
import Category from "../models/Category.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const categories = await Category.find({ storeId: req.storeId }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });

    const exists = await Category.findOne({ name: name.trim(), storeId: req.storeId });
    if (exists) return res.status(400).json({ message: "Category already exists" });

    const category = await Category.create({ name: name.trim(), storeId: req.storeId });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Category already exists" });
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;