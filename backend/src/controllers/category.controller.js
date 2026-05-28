import Category from "../models/Category.js";

// GET ALL — user-scoped
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to load categories", error: err.message });
  }
};

// CREATE — user-scoped, no duplicates
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });

    const exists = await Category.findOne({ name: name.trim(), userId: req.user._id });
    if (exists) return res.status(400).json({ message: "Category already exists" });

    const category = await Category.create({ name: name.trim(), userId: req.user._id });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
};

// DELETE — user-scoped
export const deleteCategory = async (req, res) => {
  try {
    await Category.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};