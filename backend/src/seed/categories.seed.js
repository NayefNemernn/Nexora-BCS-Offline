//this file is used to seed the categories collection in the database with initial data. It connects to the MongoDB database, deletes any existing categories, and then inserts a predefined list of categories. Each category has a name in both English and Arabic. After seeding, it logs a success message and exits the process. If there's an error during the process, it logs the error and exits with a failure code.
import mongoose from "mongoose";
import dotenv from "dotenv";
import Category from "../models/Category.js";

dotenv.config();

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");

    await Category.deleteMany();

    const categories = [
      { name: "Food & Grocery - المواد الغذائية" },
      { name: "Bakery - المخبوزات" },
      { name: "Beverages - المشروبات" },
      { name: "Snacks - الوجبات الخفيفة" },
      { name: "Frozen - المجمدات" },
      { name: "Household - مواد تنظيف" },
      { name: "Personal Care - عناية شخصية" },
      { name: "Baby - مستلزمات أطفال" },
      { name: "Pet - مستلزمات حيوانات" },
      { name: "Health - الصحة" }
    ];

    await Category.insertMany(categories);

    console.log("✅ Categories seeded successfully!");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedCategories();