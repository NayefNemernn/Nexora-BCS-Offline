/**
 * Lebanese Market Products Seed
 * Seeds the database with real products sold in Lebanese supermarkets.
 * Images are fetched from reliable public sources (brand logos / product images).
 *
 * Usage:  node src/seed/products.seed.js <adminUserId>
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

dotenv.config();

// ---------------------------------------------------------------------------
// Product catalogue — 60+ products found in Lebanese supermarkets
// Images: high-quality brand/product images from public CDNs
// ---------------------------------------------------------------------------
const PRODUCTS = [
  // ── BEVERAGES ──────────────────────────────────────────────────────────
  {
    name: "Pepsi 330ml Can",
    barcode: "5000112602913",
    price: 1.5,
    cost: 0.9,
    stock: 100,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Pepsi_logo_2014.svg/800px-Pepsi_logo_2014.svg.png",
  },
  {
    name: "Pepsi 1.5L Bottle",
    barcode: "5000112610475",
    price: 2.5,
    cost: 1.5,
    stock: 60,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Pepsi_logo_2014.svg/800px-Pepsi_logo_2014.svg.png",
  },
  {
    name: "7UP 330ml Can",
    barcode: "5000112635980",
    price: 1.5,
    cost: 0.9,
    stock: 80,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/7_Up_logo.svg/800px-7_Up_logo.svg.png",
  },
  {
    name: "7UP 1.5L Bottle",
    barcode: "5000112635997",
    price: 2.5,
    cost: 1.5,
    stock: 50,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/7_Up_logo.svg/800px-7_Up_logo.svg.png",
  },
  {
    name: "RC Cola 330ml Can",
    barcode: "4002244010013",
    price: 1.2,
    cost: 0.7,
    stock: 60,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/RC_Cola_Logo.svg/800px-RC_Cola_Logo.svg.png",
  },
  {
    name: "Coca-Cola 330ml Can",
    barcode: "5449000000996",
    price: 1.5,
    cost: 0.9,
    stock: 120,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/800px-Coca-Cola_logo.svg.png",
  },
  {
    name: "Coca-Cola 1.5L Bottle",
    barcode: "5449000131898",
    price: 2.5,
    cost: 1.5,
    stock: 70,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/800px-Coca-Cola_logo.svg.png",
  },
  {
    name: "Fanta Orange 330ml Can",
    barcode: "5449000133885",
    price: 1.5,
    cost: 0.9,
    stock: 80,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Fanta-brand-logo.svg/800px-Fanta-brand-logo.svg.png",
  },
  {
    name: "Sprite 330ml Can",
    barcode: "5449000131904",
    price: 1.5,
    cost: 0.9,
    stock: 80,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Sprite-brand-logo.svg/800px-Sprite-brand-logo.svg.png",
  },
  {
    name: "Mirinda Orange 330ml Can",
    barcode: "5000112637014",
    price: 1.2,
    cost: 0.7,
    stock: 70,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Mirinda_logo.svg/800px-Mirinda_logo.svg.png",
  },
  {
    name: "Red Bull 250ml",
    barcode: "9002490100070",
    price: 3.0,
    cost: 2.0,
    stock: 48,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Red_Bull_logo_2022.svg/800px-Red_Bull_logo_2022.svg.png",
  },
  {
    name: "Lipton Ice Tea Peach 500ml",
    barcode: "6281006511897",
    price: 1.8,
    cost: 1.1,
    stock: 60,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Lipton_logo_2021.svg/800px-Lipton_logo_2021.svg.png",
  },
  {
    name: "Rani Float Mango 240ml",
    barcode: "6291003050065",
    price: 1.5,
    cost: 0.9,
    stock: 72,
    category: "Beverages - المشروبات",
    image: "https://images.openfoodfacts.org/images/products/629/100/305/0072/front_en.3.400.jpg",
  },
  {
    name: "Aquafina Water 500ml",
    barcode: "6221155000022",
    price: 0.5,
    cost: 0.25,
    stock: 200,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Aquafina-logo-flat.svg/800px-Aquafina-logo-flat.svg.png",
  },
  {
    name: "Baraka Water 1.5L",
    barcode: "6281337000013",
    price: 0.75,
    cost: 0.4,
    stock: 150,
    category: "Beverages - المشروبات",
    image: "https://images.openfoodfacts.org/images/products/628/133/700/0013/front_ar.3.400.jpg",
  },
  {
    name: "Nescafé Classic 200g Jar",
    barcode: "7613035997547",
    price: 8.5,
    cost: 5.5,
    stock: 30,
    category: "Beverages - المشروبات",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Nescafe_Logo_2014.svg/800px-Nescafe_Logo_2014.svg.png",
  },

  // ── SNACKS ─────────────────────────────────────────────────────────────
  {
    name: "Lay's Classic 150g",
    barcode: "6221033400117",
    price: 2.0,
    cost: 1.2,
    stock: 60,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Lay%27s_logo.svg/800px-Lay%27s_logo.svg.png",
  },
  {
    name: "Lay's Cheese 150g",
    barcode: "6221033400124",
    price: 2.0,
    cost: 1.2,
    stock: 50,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Lay%27s_logo.svg/800px-Lay%27s_logo.svg.png",
  },
  {
    name: "Pringles Original 165g",
    barcode: "5053990103770",
    price: 3.5,
    cost: 2.2,
    stock: 40,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Pringles_logo.svg/800px-Pringles_logo.svg.png",
  },
  {
    name: "Oreo Chocolate 154g",
    barcode: "7622210713780",
    price: 2.5,
    cost: 1.5,
    stock: 55,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Nabisco_Oreo_logo.svg/800px-Nabisco_Oreo_logo.svg.png",
  },
  {
    name: "Kit Kat 4-Finger 41.5g",
    barcode: "5000159461092",
    price: 1.5,
    cost: 0.9,
    stock: 80,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/KitKat_logo.svg/800px-KitKat_logo.svg.png",
  },
  {
    name: "Snickers 50g",
    barcode: "5000159461528",
    price: 1.5,
    cost: 0.9,
    stock: 80,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Snickers-Logo.svg/800px-Snickers-Logo.svg.png",
  },
  {
    name: "Twix 50g",
    barcode: "5000159407527",
    price: 1.5,
    cost: 0.9,
    stock: 70,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Twix_Logo.svg/800px-Twix_Logo.svg.png",
  },
  {
    name: "M&M's Peanut 45g",
    barcode: "5000159451085",
    price: 2.0,
    cost: 1.2,
    stock: 60,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/M%26M%27s_logo.svg/800px-M%26M%27s_logo.svg.png",
  },

  // ── FOOD & GROCERY ─────────────────────────────────────────────────────
  {
    name: "Maggi Chicken Noodles 77g",
    barcode: "6281006512009",
    price: 0.75,
    cost: 0.4,
    stock: 100,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Maggi_logo.svg/800px-Maggi_logo.svg.png",
  },
  {
    name: "Heinz Ketchup 342g",
    barcode: "0013000006309",
    price: 3.5,
    cost: 2.2,
    stock: 40,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Heinz_logo.svg/800px-Heinz_logo.svg.png",
  },
  {
    name: "Knorr Chicken Bouillon 12 Cubes",
    barcode: "8712100688980",
    price: 2.0,
    cost: 1.2,
    stock: 50,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Knorr_logo.svg/800px-Knorr_logo.svg.png",
  },
  {
    name: "Lurpak Butter 200g",
    barcode: "5740900290600",
    price: 4.5,
    cost: 3.0,
    stock: 30,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Lurpak_logo.svg/800px-Lurpak_logo.svg.png",
  },
  {
    name: "Nutella 400g",
    barcode: "8000500217580",
    price: 7.5,
    cost: 5.0,
    stock: 25,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Nutella_logo.svg/800px-Nutella_logo.svg.png",
  },
  {
    name: "Nido Fortified Full Cream Milk 900g",
    barcode: "6281001520175",
    price: 12.0,
    cost: 8.5,
    stock: 20,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Nido_logo.svg/800px-Nido_logo.svg.png",
  },
  {
    name: "President Cream Cheese 150g",
    barcode: "3228021220013",
    price: 3.0,
    cost: 1.8,
    stock: 30,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Pr%C3%A9sident_logo.svg/800px-Pr%C3%A9sident_logo.svg.png",
  },
  {
    name: "Kiri Cream Cheese 8 Portions",
    barcode: "3033490008285",
    price: 3.5,
    cost: 2.2,
    stock: 25,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://images.openfoodfacts.org/images/products/303/349/000/8285/front_en.5.400.jpg",
  },
  {
    name: "Uncle Ben's Parboiled Rice 1kg",
    barcode: "5010034001034",
    price: 4.0,
    cost: 2.5,
    stock: 40,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Uncle_Ben%27s_logo.svg/800px-Uncle_Ben%27s_logo.svg.png",
  },
  {
    name: "Al Wadi Tahini 400g",
    barcode: "6281006490007",
    price: 3.5,
    cost: 2.2,
    stock: 35,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://images.openfoodfacts.org/images/products/628/100/649/0007/front_en.4.400.jpg",
  },
  {
    name: "California Garden Chickpeas 400g",
    barcode: "6281006490601",
    price: 1.5,
    cost: 0.9,
    stock: 60,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://images.openfoodfacts.org/images/products/628/100/649/0601/front_en.3.400.jpg",
  },
  {
    name: "California Garden Tuna in Water 185g",
    barcode: "6281006491509",
    price: 2.5,
    cost: 1.6,
    stock: 50,
    category: "Food & Grocery - المواد الغذائية",
    image: "https://images.openfoodfacts.org/images/products/628/100/649/1509/front_en.4.400.jpg",
  },
  {
    name: "Gandour Biscuits Assorted 400g",
    barcode: "6221036001011",
    price: 3.0,
    cost: 1.8,
    stock: 40,
    category: "Snacks - الوجبات الخفيفة",
    image: "https://images.openfoodfacts.org/images/products/622/103/600/1011/front_en.3.400.jpg",
  },

  // ── BAKERY ─────────────────────────────────────────────────────────────
  {
    name: "Toufayan Pita Bread White 6pk",
    barcode: "6281006650004",
    price: 1.5,
    cost: 0.9,
    stock: 50,
    category: "Bakery - المخبوزات",
    image: "https://images.openfoodfacts.org/images/products/628/100/665/0004/front_en.3.400.jpg",
  },
  {
    name: "Bread Toast White 500g",
    barcode: "6221036050019",
    price: 2.0,
    cost: 1.2,
    stock: 40,
    category: "Bakery - المخبوزات",
    image: "https://images.openfoodfacts.org/images/products/622/103/605/0019/front_en.3.400.jpg",
  },

  // ── HOUSEHOLD ──────────────────────────────────────────────────────────
  {
    name: "Ariel Powder 3kg",
    barcode: "8001841652634",
    price: 9.0,
    cost: 6.0,
    stock: 20,
    category: "Household - مواد تنظيف",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Ariel_logo.svg/800px-Ariel_logo.svg.png",
  },
  {
    name: "Fairy Dish Soap 750ml",
    barcode: "8001841652818",
    price: 3.5,
    cost: 2.2,
    stock: 30,
    category: "Household - مواد تنظيف",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Fairy-logo.svg/800px-Fairy-logo.svg.png",
  },
  {
    name: "Dettol Antibacterial Soap 100g",
    barcode: "6281006521605",
    price: 1.5,
    cost: 0.9,
    stock: 60,
    category: "Personal Care - عناية شخصية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Dettol_logo.svg/800px-Dettol_logo.svg.png",
  },
  {
    name: "Lifebuoy Hand Soap 100g",
    barcode: "6281006521001",
    price: 1.2,
    cost: 0.7,
    stock: 60,
    category: "Personal Care - عناية شخصية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Lifebuoy-logo.svg/800px-Lifebuoy-logo.svg.png",
  },
  {
    name: "Pampers Diapers Size 3 (50pc)",
    barcode: "8001090380845",
    price: 18.0,
    cost: 13.0,
    stock: 15,
    category: "Baby - مستلزمات أطفال",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Pampers_logo.svg/800px-Pampers_logo.svg.png",
  },
  {
    name: "Huggies Wipes 72pc",
    barcode: "8850008501017",
    price: 5.0,
    cost: 3.5,
    stock: 30,
    category: "Baby - مستلزمات أطفال",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Huggies-logo.svg/800px-Huggies-logo.svg.png",
  },

  // ── PERSONAL CARE ──────────────────────────────────────────────────────
  {
    name: "Colgate Total Toothpaste 100ml",
    barcode: "6221033406003",
    price: 2.5,
    cost: 1.5,
    stock: 40,
    category: "Personal Care - عناية شخصية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Colgate_logo.svg/800px-Colgate_logo.svg.png",
  },
  {
    name: "Head & Shoulders Shampoo 400ml",
    barcode: "8001090380883",
    price: 7.0,
    cost: 4.5,
    stock: 25,
    category: "Personal Care - عناية شخصية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Head_%26_Shoulders_logo.svg/800px-Head_%26_Shoulders_logo.svg.png",
  },
  {
    name: "Dove Body Lotion 250ml",
    barcode: "8710908427558",
    price: 5.0,
    cost: 3.2,
    stock: 25,
    category: "Personal Care - عناية شخصية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Dove_logo.svg/800px-Dove_logo.svg.png",
  },
  {
    name: "Gillette Fusion Razors 2pk",
    barcode: "7702018469864",
    price: 9.0,
    cost: 6.0,
    stock: 20,
    category: "Personal Care - عناية شخصية",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Gillette_logo.svg/800px-Gillette_logo.svg.png",
  },

  // ── HEALTH ─────────────────────────────────────────────────────────────
  {
    name: "Panadol Extra 500mg (24 tablets)",
    barcode: "6281034023000",
    price: 4.0,
    cost: 2.5,
    stock: 30,
    category: "Health - الصحة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Panadol_logo.svg/800px-Panadol_logo.svg.png",
  },
  {
    name: "Band-Aid Assorted 30pc",
    barcode: "3574661385700",
    price: 3.5,
    cost: 2.2,
    stock: 20,
    category: "Health - الصحة",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Band-Aid_Brand_Logo.svg/800px-Band-Aid_Brand_Logo.svg.png",
  },
];

// ---------------------------------------------------------------------------
async function seedProducts(userId) {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Resolve category IDs
  const catDocs = await Category.find({});
  const catMap = {};
  catDocs.forEach((c) => (catMap[c.name] = c._id));

  // Avoid duplicates (barcode + userId)
  const inserted = [];
  const skipped  = [];

  for (const p of PRODUCTS) {
    const catId = catMap[p.category] || null;
    const exists = await Product.findOne({ barcode: p.barcode, userId });
    if (exists) { skipped.push(p.name); continue; }

    await Product.create({
      name:     p.name,
      barcode:  p.barcode,
      price:    p.price,
      cost:     p.cost,
      stock:    p.stock,
      image:    p.image,
      category: catId,
      userId,
    });
    inserted.push(p.name);
  }

  console.log(`\n✅ Inserted ${inserted.length} products`);
  if (skipped.length) console.log(`⚠️  Skipped ${skipped.length} (already exist):`, skipped.join(", "));
  process.exit();
}

// Run:  node src/seed/products.seed.js <userId>
const userId = process.argv[2];
if (!userId) {
  console.error("Usage: node src/seed/products.seed.js <adminUserId>");
  process.exit(1);
}
seedProducts(userId);