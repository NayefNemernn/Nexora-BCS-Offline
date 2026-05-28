# MARKET-POS — Complete Product Documentation
### Version 2.1 | Client Presentation Guide

---

## Table of Contents

1. [What Is MARKET-POS?](#1-what-is-market-pos)
2. [Why MARKET-POS Beats Every Other POS](#2-why-market-pos-beats-every-other-pos)
3. [Module Overview](#3-module-overview)
4. [Feature Deep-Dives](#4-feature-deep-dives)
   - 4.1 [Core POS & Checkout](#41-core-pos--checkout)
   - 4.2 [Products & Categories](#42-products--categories)
   - 4.3 [Inventory & Batch Management](#43-inventory--batch-management)
   - 4.4 [Customer Management](#44-customer-management)
   - 4.5 [Discount & Promo System](#45-discount--promo-system)
   - 4.6 [Shift & Cash Drawer Management](#46-shift--cash-drawer-management)
   - 4.7 [Expense Tracking](#47-expense-tracking)
   - 4.8 [Supplier Management](#48-supplier-management)
   - 4.9 [Reports & Analytics](#49-reports--analytics)
   - 4.10 [AI Business Intelligence](#410-ai-business-intelligence)
   - 4.11 [Lebanese VAT Compliance](#411-lebanese-vat-compliance)
   - 4.12 [Online Store & Delivery Module](#412-online-store--delivery-module)
   - 4.13 [Café Module — Staff Side](#413-café-module--staff-side)
   - 4.14 [Café Customer App & Gamification](#414-café-customer-app--gamification)
   - 4.15 [Multi-Store SuperAdmin Panel](#415-multi-store-superadmin-panel)
   - 4.16 [Security & Audit Log](#416-security--audit-log)
   - 4.17 [Telegram Delivery Notifications](#417-telegram-delivery-notifications)
   - 4.18 [Nexora Marketing Website & Free Trial Flow](#418-nexora-marketing-website--free-trial-flow)
5. [Demo Walkthrough — Step by Step](#5-demo-walkthrough--step-by-step)
6. [Subscription Plans & Pricing](#6-subscription-plans--pricing)
7. [Technical Stack & Deployment](#7-technical-stack--deployment)
8. [What's New — Version 2.1](#8-whats-new--version-21-may-2026)

---

## 1. What Is MARKET-POS?

**MARKET-POS** is a full-stack, cloud-based Point of Sale platform built for modern Lebanese and regional businesses. It is not just a cashier screen — it is a complete business operating system that covers retail markets, delivery stores, cafés, and restaurants under one login.

**Who is it for?**

| Business Type | What They Get |
|---|---|
| Supermarket / Mini-market | Full POS + inventory + suppliers + delivery |
| Café / Restaurant | Table management + KDS + reservations + gamified loyalty app |
| Multi-branch Business | Centralized SuperAdmin panel across all branches |
| Any shop wanting delivery | Built-in online storefront + order management |

---

## 2. Why MARKET-POS Beats Every Other POS

### vs. Square, Toast, Lightspeed, Loyverse, iiko

| Feature | MARKET-POS | Square | Toast | Loyverse | iiko |
|---|:---:|:---:|:---:|:---:|:---:|
| Works without internet (offline cart) | ✅ | ✅ | ❌ | Partial | ❌ |
| Built-in online storefront | ✅ | Extra cost | Extra cost | ❌ | ❌ |
| Built-in café module with KDS | ✅ | ❌ | ✅ | ❌ | ✅ |
| Gamified loyalty app for customers | ✅ | ❌ | ❌ | ❌ | ❌ |
| AI-powered reorder & promo suggestions | ✅ | ❌ | ❌ | ❌ | ❌ |
| FIFO batch expiry tracking | ✅ | ❌ | ❌ | ❌ | Partial |
| Lebanese VAT (11%) per-product | ✅ | ❌ | ❌ | ❌ | ❌ |
| Telegram delivery driver alerts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Multi-store SuperAdmin panel | ✅ | Extra cost | Extra cost | ❌ | ✅ |
| Real-time socket updates (floor/kitchen) | ✅ | ❌ | Partial | ❌ | ✅ |
| Customer games (slots, spin, trivia...) | ✅ | ❌ | ❌ | ❌ | ❌ |
| QR table ordering by customer | ✅ | ❌ | Extra | ❌ | Partial |
| Split bill (cash + card + pay later) | ✅ | ❌ | Partial | ❌ | ✅ |
| Profit/loss per product | ✅ | Partial | Partial | ❌ | ✅ |
| Full audit log (every action tracked) | ✅ | ❌ | Partial | ❌ | ✅ |
| Arabic / English interface | ✅ | ❌ | ❌ | Partial | Partial |
| Local pricing (no USD subscription trap) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Product variants (size, color, etc.) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pay-later / credit account per customer | ✅ | ❌ | ❌ | Partial | ❌ |

### The 3 Unique Differentiators

**1. AI Business Intelligence (built-in, no extra cost)**
No other regional POS gives you AI-generated reorder lists and promotional suggestions based on your own stock velocity and batch expiry dates.

**2. Gamified Café Customer App**
Customers scan a QR code at their table, order from their phone, earn loyalty points, and play 5 different games (Slot Machine, Spin Wheel, Scratch Card, Mystery Box, Trivia) to win points redeemable for free items. No other POS in the region offers this.

**3. Full End-to-End Delivery**
The system creates a public storefront automatically. Customers order online, the admin approves, the cashier gets the cart injected into the POS automatically, and the driver gets notified via Telegram.

---

## 3. Module Overview

```
MARKET-POS Platform
│
├── Frontend POS App (Web — Cashier/Admin)
│   ├── POS / Checkout Screen
│   ├── Products & Categories
│   ├── Inventory & Batch Tracking
│   ├── Customer Accounts
│   ├── Discounts & Promos
│   ├── Shift Panel
│   ├── Expenses
│   ├── Suppliers
│   ├── Reports & P&L
│   ├── AI Insights (Reorder + Offers)
│   ├── Online Orders (Delivery)
│   ├── Pending Payments
│   ├── Café Floor Map & KDS
│   ├── Café Reservations
│   ├── Café Reports
│   ├── Café Settings (Loyalty, QR, Tables)
│   └── SuperAdmin Panel
│
├── Online Store Frontend (Public Storefront)
│   ├── Product Catalog
│   ├── Cart & Checkout
│   ├── Order Status Tracker
│   └── Delivery Address & Payment
│
└── Café Customer App (Mobile-first, QR)
    ├── Landing: Quick Menu vs Play & Earn
    ├── Auth: Phone/Password + Google
    ├── Dashboard: Points, Tier, Check-in
    ├── Menu & Cart (with reward redemption)
    ├── Live Order Tracker
    ├── Game Hub: 5 Games
    │   ├── Slot Machine
    │   ├── Spin Wheel
    │   ├── Scratch Card
    │   ├── Mystery Box
    │   └── Trivia Challenge
    └── Rewards Page
```

---

## 4. Feature Deep-Dives

---

### 4.1 Core POS & Checkout

The checkout screen is the heartbeat of the system. It is designed to be fast — a trained cashier can complete a transaction in under 15 seconds.

**Checkout Capabilities:**
- **Barcode scanning** — scan any product barcode to add it instantly
- **Quick search** — type product name to find and add items
- **Category grid** — tap category tiles to browse products visually
- **Product images** — thumbnail display on every product card
- **Product variants** — select size, color, or other variant at checkout
- **Quantity editing** — tap quantity to type or use +/− buttons
- **Per-item discounts** — apply a discount to a single line item
- **Order-level discount** — apply a flat or percentage discount to the whole order
- **Promo codes** — customer enters a code, system applies the promotion automatically
- **Multiple payment methods:** Cash, Card, Bank Transfer, Pay Later, Split Payment, Cash on Delivery
- **Split payment** — divide a single sale across multiple methods (e.g., $20 cash + $15 card + $10 pay later)
- **Pay Later / Credit** — record a debt against a named customer
- **Hold & resume** — park a sale mid-process and serve another customer
- **Customer attachment** — link a sale to a CRM customer for history tracking
- **Notes field** — add order notes visible on receipt
- **Receipt printing** — browser print dialog with formatted thermal receipt, store logo, VAT number, footer text
- **Digital receipt** — receipt shown on screen after sale completes
- **Void sale** — manager PIN required, full stock is restocked automatically
- **Return items** — partial or full return on any past sale with stock restock and refund tracking

**Branded POS Header:**
The top bar of the POS screen shows the Nexora BCS logo and a **compact LBP/USD exchange rate display** that the cashier can tap to update the rate inline — no need to navigate away.

**Product Grid Pagination:**
Products are displayed 40 per page. Navigation arrows appear at the bottom of the grid so the screen stays fast even for stores with hundreds of products.

**Real-Time Online Order Injection:**
When the admin accepts an online order in the Online Orders panel, the order cart is pushed **instantly** to the cashier's POS screen via WebSocket — no page refresh, no manual re-entry. The cashier sees the items appear live and processes the delivery sale immediately.

**Offline Mode:**
The POS uses an IndexedDB offline cache. If internet is lost, the cashier can continue selling. When connectivity returns, all sales sync automatically.

---

### 4.2 Products & Categories

**Product Fields:**
- Name, Barcode (auto-generated if empty), Price, Cost Price
- Category (with emoji icon)
- Stock quantity
- Product image (upload to Supabase or paste URL)
- Expiry date
- VAT Exempt toggle
- Online Store visibility toggle
- Product Variants (e.g., Small/Medium/Large, Red/Blue — each with own price and stock)

**Category Management:**
- Create, rename, delete categories
- Emoji/icon assigned to each category
- Products filter by category in POS grid

**Smart Features:**
- Products are auto-disabled when their expiry date passes
- Low-stock warning (products with ≤5 units shown on dashboard)
- Variant support: one product SKU, multiple sellable options, each tracked independently
- **Barcode auto-fill on unknown scan:** if a cashier scans a barcode not found in inventory, the system opens the Add Product form with the barcode field pre-filled — the staff member just adds the name and price to register it immediately

---

### 4.3 Inventory & Batch Management

This is where MARKET-POS goes far beyond basic POS systems.

**Batch Tracking:**
Every stock-in event creates a numbered batch with:
- Batch number (auto-generated)
- Supplier link
- Received date
- Expiry date
- Cost price at time of purchase
- Quantity received and remaining

**FIFO Automatic Deduction:**
When a product is sold, the system deducts stock from the earliest-expiring batch first (First In, First Out). Batches with no expiry are consumed last. This prevents expired stock from sitting hidden in the warehouse.

**Batch Status Dashboard:**
| Status | Meaning |
|---|---|
| Active | Has remaining quantity, not expired |
| Expiring Soon | Will expire within 30 days |
| Expired | Past expiry date, still has stock |
| Depleted | All units sold |

**Stock Log:**
Every stock movement is recorded with timestamp, who did it, and why:
- Sale (auto)
- Return (auto)
- Void (auto)
- Manual adjustment (+/−)
- Batch received
- Batch adjusted

**Manual Stock Adjustment:**
Admin can add or remove units with a reason. Every adjustment is logged and audited.

---

### 4.4 Customer Management

**Customer Profile:**
- Name, phone, email, address, notes
- Total spent, total orders
- Outstanding balance (from Pay Later)
- Full purchase history (last 50 orders)

**Pay Later / Credit Accounts:**
When a customer does not pay in full, the balance is tracked in a Hold Sale. Later payments are recorded and deducted from the balance. The cashier can see outstanding balances per customer and collect partial or full payments at any time.

**Customer Ledger:**
Every interaction is timestamped — what they bought, how much they paid, what is still owed.

---

### 4.5 Discount & Promo System

**Discount Types:**
- Fixed amount off (e.g., $5 off)
- Percentage off (e.g., 15% off)
- Applied at order level or per line item

**Promo Codes:**
- Create reusable or single-use codes
- Set usage limit (e.g., first 100 customers only)
- Set expiry date
- Discount is applied automatically when code is entered at checkout

**Points Offers (Retail Loyalty):**
- Configure points-per-currency-unit (e.g., 1 point per $1 spent)
- Customers accumulate points across orders
- Redeem points against future purchases

---

### 4.6 Shift & Cash Drawer Management

This is essential for multi-cashier stores where you need to know exactly who handled what money.

**Opening a Shift:**
- Cashier counts the float (opening cash in drawer)
- Denominations entry: how many $1, $5, $10, $20 bills — system calculates total
- Shift opens and logs the opening float

**During the Shift:**
- All sales are linked to the active shift
- Cash In / Cash Out events (e.g., petty cash withdrawal, adding float) recorded with reason

**Closing a Shift:**
- Cashier counts the closing cash in drawer (with denomination breakdown)
- System calculates: Expected Cash = opening float + cash sales + paid-in − paid-out − refunds
- Variance = actual closing count − expected cash
- Full breakdown by payment method: Cash, Card, Bank Transfer, Pay Later, Cash on Delivery, Delivery
- Net revenue after refunds and discounts
- Shift report saved permanently

**Shift History:**
- All past shifts visible with full summary
- Admin can review any cashier's shift at any time

---

### 4.7 Expense Tracking

Track business expenses directly inside the POS:
- Amount, category, description, date
- Linked to store for reporting
- Appears in profit/loss calculations

---

### 4.8 Supplier Management

- Create supplier profiles: name, contact, phone, email
- Link batches to suppliers when receiving stock
- Know which supplier delivered which batch and at what cost
- AI reorder suggestions show supplier options alongside suggested quantities

---

### 4.9 Reports & Analytics

All reports support daily, weekly, monthly, and yearly periods.

**Dashboard Overview:**
- Today's sales and order count
- This week / month / year totals
- Pay Later outstanding balance and number of accounts
- Total products, total customers
- Low stock alerts (products with ≤5 units)
- Sales chart (by hour for today, by day for week/month, by month for year)
- Top 5 selling products

**Sales Report:**
- Full transaction list with search and filter
- Filter by product, customer name, sale ID, status
- Each sale shows: items, total, payment method, cashier, date

**Profit & Loss Report:**
- Revenue, COGS (cost of goods sold), discounts, refunds
- Gross profit and gross margin %
- Per-product breakdown: revenue, cost, quantity sold, profit, margin %
- Filter by any date range

**Shift Reports:**
- Every shift close generates a detailed report
- Cash variance tracking
- Per-payment-method breakdown

**Café Reports (8 Sections):**
1. Revenue — line chart + total/average
2. Peak Hours — 7×24 heatmap (when is your café busiest?)
3. Menu Performance — top and bottom items, category donut chart
4. Table Analytics — revenue and occupancy per table
5. Kitchen Efficiency — average prep time per category
6. Reservations — no-shows, fill rate, peak booking slots
7. Customer Loyalty — new vs. returning, tier breakdown, top 10 leaderboard
8. Games Stats — most played games, win rates, points distributed

---

### 4.10 AI Business Intelligence

Powered by Google Gemini AI. Two engines built in:

**AI Offer Suggestions:**

The system analyzes every product's:
- Current stock level
- Average daily sales (last 60 days)
- Batch expiry dates
- Days-to-sell vs. days-to-expiry ratio
- Profit margin

Products that are moving too slowly or will expire before they sell are flagged. The AI generates specific, actionable promotional offers:

Example AI output:
> **"Sell 30 units of Whole Milk in 7 days — 20% off (still profitable at 15% margin)"**
> Urgency: High | Type: Discount 20% | Expected impact: Clear batch #B-0042 before June 15

**AI Reorder Suggestions:**

Analyzes:
- Average daily sales velocity (last 30 days)
- Current stock level
- Days of stock remaining
- 7-day supplier lead time
- Target: maintain 30 days of stock

Generates a prioritized reorder list (urgent / normal / low) with exact suggested quantities and cost estimates. Admin reviews, adjusts quantities if needed, saves as a Purchase Order, and tracks it through: Pending → Approved → Ordered → Received.

**How to use:**
1. Go to **AI Insights** in the sidebar
2. Click **"Offer Suggestions"** tab — see what to promote
3. Click **"Reorder Suggestions"** tab — see what to order
4. Adjust quantities → click **Save as Purchase Order**
5. Track the order status in the Purchase Orders list

---

### 4.11 Lebanese VAT Compliance

Built specifically for Lebanese tax law.

**Setup:**
- Go to Store Settings → set Tax Rate = **11%** (Lebanese standard VAT)
- Enter your VAT Number (Tax Number) — appears on every printed receipt

**Per-Product VAT Exemption:**
Not all products are taxed in Lebanon. Basic food staples, medicines, books, agricultural inputs, and educational materials are exempt. Each product has a **VAT Exempt** toggle. Mark exempt products once; the system handles everything else automatically.

**How VAT is calculated at checkout:**
1. System sums the subtotal of all non-exempt items = Vatable Amount
2. VAT = Vatable Amount × 11%
3. Total = Subtotal + VAT − Discounts

**On receipts:**
- Subtotal (before VAT)
- VAT amount (11%)
- Total
- Your VAT number (as required by Lebanese law)

---

### 4.12 Online Store & Delivery Module

Turn any store into an online shop in one click.

**Activation:**
- Go to Store Settings → Online Store tab
- Toggle "Online Store Active"
- Set delivery fee and minimum order
- Set estimated delivery time range (e.g., 30–60 min)
- Share the store link or print the QR code for your storefront

**Customer Experience (Store Frontend):**
1. Customer visits your store URL: `yourstore.com/store/your-slug`
2. Browses products by category with search and images
3. Adds items to a floating cart
4. Registers/logs in or continues as guest
5. Enters delivery address
6. Chooses payment: Bank Transfer or Cash on Delivery
7. Places order
8. Receives real-time order status updates (pending → accepted → out for delivery → delivered)

**Admin Experience:**
1. New order notification arrives in the **Online Orders** page
2. Admin reviews the order (items, address, payment method)
3. Clicks **Accept** — the cart is automatically injected into the cashier's POS screen
4. Cashier processes as a delivery sale (cash on delivery or bank transfer)
5. Order status updates to "Out for Delivery" automatically
6. Driver delivers and confirms cash payment

**Telegram Driver Notifications:**
- Configure your delivery drivers' Telegram chat IDs in Store Settings
- When an order is accepted, a formatted message is sent to the driver via Telegram Bot:
  - Customer name
  - Address
  - Items list
  - Payment method
  - Total amount

**Delivery Contact Phone on Receipts:**
Configure a phone number in Store Settings → Online Store → "Delivery Contact Number". This number is printed on all delivery receipts so customers can call about their order.

**QR Code on Receipts:**
Every printed receipt for a store with an active online storefront automatically includes a QR code linking to the store's online shop — a passive promotion to every customer who receives a receipt.

**Online Orders Notification Badge:**
The "Online Orders" toggle in the POS sidebar shows a live badge with the count of pending orders. When a new order arrives, a toast notification pops up with the order number so the cashier never misses an incoming order — even if they are on a different screen.

**Live Order Status Dots:**
Alongside the badge count, color-coded status dots show at a glance how many orders are in each stage (pending, accepted, out for delivery, delivered) — no need to open the panel to check the queue.

**Per-Product Online Visibility:**
Each product has an "Available Online" toggle. You can sell items in-store that are not listed online, and vice versa.

---

### 4.13 Café Module — Staff Side

A complete café/restaurant management system, enabled per-store by the SuperAdmin.

**Floor Map:**
- Visual grid showing all tables
- Table colors: Green (free), Red (occupied), Yellow (bill requested)
- Click any table to open its order
- Drag tables to new positions in the settings layout editor
- Real-time updates via WebSocket — all staff see the same map simultaneously

**Table Order Modal:**
- Browse menu by category, add items with quantity
- Add modifier notes per item (e.g., "no sugar", "extra shot")
- Send items to kitchen (status: Pending Kitchen → Kitchen)
- Transfer selected items to another table
- Merge two tables (all items move, source table freed)
- View all items with their kitchen status

**Kitchen Display System (KDS):**
- Full-screen kitchen dashboard
- Shows all open orders grouped by table
- Items categorized as: Pending → Preparing → Ready → Served
- Click any item to cycle its status
- Audio alert (Web Audio API beep) when a new order arrives in the kitchen
- Items from customer QR orders show a "📱 Customer" badge so kitchen knows the source

**Bill / Checkout:**
- Service charge (configurable %)
- Apply discount
- Split the bill across any number of guests — each guest pays their share
- Multiple payment methods
- Checkout creates a Sale (type: "café") and frees the table automatically

**Reservations:**
- Create reservations: name, phone, date, time, table, guest count, notes
- Calendar view by date
- Convert a reservation into an active table order with one click
- Reservation list with status (confirmed, seated, cancelled, no-show)

**Café Settings:**
- Manage tables: add, rename, drag to position
- Print QR code per table → customer scans to order from their phone
- Configure loyalty: rewards CRUD, trivia questions, points-per-item
- Customer list: view all registered loyalty members, manually adjust points

---

### 4.14 Café Customer App & Gamification

Customers scan the QR code on their table and open the app on their phone. No download required — it is a web app.

**Two Modes:**

**Quick Menu (Guest):**
- No account needed
- Browse the menu, add items, place order
- Order goes straight to kitchen and appears on the floor map
- Track order status live
- Play games for entertainment (no points)

**Play & Earn (Registered):**
- Register with phone + password, or sign in with Google
- First visit: +100 welcome points
- Daily check-in: +10 points
- Order items: +10 points per item × tier multiplier
- Rate your order: +5 points
- Play games once per day to earn points
- Redeem points for free items or discounts

**Loyalty Tiers:**

| Tier | Points Range | Order Multiplier |
|---|---|---|
| Bronze | 0 – 999 | ×1.0 |
| Silver | 1,000 – 4,999 | ×1.25 |
| Gold | 5,000 – 9,999 | ×1.5 |
| Diamond | 10,000+ | ×2.0 |

**5 Games (1 per day earns points, unlimited play for fun):**

**1. Slot Machine**
Three reels with coffee-themed symbols (☕ 🧁 🍰 ⭐). Three matching stars = 500 pts. Three matching = 200 pts. Two matching = 50 pts. No match = 10 pts consolation.

**2. Scratch Card**
A 3×3 grid on a canvas. Drag your finger to scratch. Match 3 identical symbols to win: Coin = 50 pts, Gem = 150 pts, Crown = 300 pts.

**3. Spin Wheel**
8 animated segments spin around. Prizes: 25/50/75/100/200 pts, free add-on, double order points, 15 pts.

**4. Mystery Box**
Three face-down cards. Pick one. It reveals a points prize (50/100/200/300/500) or a special "50% off item" reward.

**5. Trivia Challenge**
3 multiple-choice questions (set by the café admin). 30-second timer per question. 30 pts per correct answer + 20 pt streak bonus for a perfect score.

**Rewards Redemption:**
Before placing an order, the customer taps "Use Points" to select from available rewards (free item, % discount, flat discount). The reward is deducted from their order total automatically.

**Live Order Tracking:**
After placing an order, the customer sees a live status screen that updates in real time as the kitchen prepares and serves the order. After the order is served, they are prompted to rate it (1–5 stars + comment) and can play a game.

---

### 4.15 Multi-Store SuperAdmin Panel

The SuperAdmin is the platform operator — the person who sells MARKET-POS as a service.

**Platform Overview Dashboard:**
- Total stores, active stores
- Total users, total products across all stores
- Total revenue across all stores
- Store growth chart (last 6 months)
- Revenue by month chart
- Plan distribution (Trial/Basic/Pro/Enterprise)
- Expiring soon count (within 7 days)
- Activity feed: recent sales, new users, new stores

**Per-Store Management:**
- View full store details: users, products, recent sales, audit logs
- Enable / Disable a store (locked out on disable)
- Toggle Café Module on/off per store
- Toggle Online Store on/off
- Update subscription plan (Trial/Basic/Pro/Enterprise)
- Set plan expiry date
- Set monthly price
- Extend plan (add days)
- Add internal notes about the client
- Send a notification/alert to the store's admin panel
- Bulk notify multiple stores at once
- Bulk enable/disable stores
- Bulk extend plans

**User Management per Store:**
- View all users with their sales stats (total revenue, today revenue, order counts)
- Create new users (admin, cashier)
- Change user role
- Reset password
- Enable/disable user accounts
- Force logout a user from all devices
- Force logout a specific device
- Set max concurrent devices per user
- View per-user sales history

**Café Staff Management (SuperAdmin):**
- Create, update, delete café staff (managers, kitchen, servers)
- Set roles and activation status

**Impersonation:**
The SuperAdmin can log in as any store's admin with a single click for support or demos — without knowing the client's password.

**Store Creation:**
- Create a store of type: Market, Café, or Both (Market + Café)
- Set plan, user limits, product limits
- Creates admin user and/or café manager automatically
- Auto-generates a unique URL slug for the online storefront

**Copy Products Between Stores:**
Copy all products (with categories, prices, and settings) from one store to another in one click — ideal for onboarding a new franchise branch.

**Store Cloning:**
Clone an existing store's structure (categories, settings) into a new store — ideal for franchise clients.

**Ownership Transfer:**
Transfer a store to a new owner (new admin username) without losing any data.

**Data Export:**
Export all stores to a JSON/CSV format: name, owner, plan, status, expiry, users, products, revenue, monthly price.

---

### 4.16 Security & Audit Log

Every action in the system is recorded. Nothing is ever invisible.

**Audit Log tracks:**
- Login / Logout (with IP address and device)
- Sale created, voided, returned
- Product created, updated, deleted
- Stock adjusted (manual)
- Batch received
- Customer created, updated
- Café table opened, order sent to kitchen, checkout
- Price changes, category changes, settings changes

**Device Security:**
- Each user has a configurable maximum number of concurrent device sessions
- Logging in on a new device beyond the limit forces logout of the oldest session
- SuperAdmin can force-logout any device of any user remotely

**Void PIN:**
A store can set a manager PIN. Any sale void requires the PIN — preventing cashiers from voiding sales without authorization.

**Self-Session Management (SuperAdmin):**
The SuperAdmin can view all their own active sessions and kick any single device directly from the Profile tab — useful when logging in from a public machine.

**Dark Mode:**
The entire dashboard UI supports a dark/light mode toggle available directly in the sidebar navigation bar, persisting per user.

**Mobile Bottom Sheet Navigation:**
On small screens, the sidebar collapses into a bottom sheet drawer that slides up from the bottom of the screen — making the full admin panel usable on a phone without pinching or zooming.

---

### 4.17 Telegram Delivery Notifications

When an online order is dispatched:
1. The system sends a Telegram message to one or more configured delivery drivers
2. The message contains: customer name, full delivery address, ordered items, total, and payment method
3. Driver confirms delivery from their phone

**Driver Setup:** Go to Store Settings → Online Store → Telegram section → enter your Bot Token → have each driver send a message to the bot → click "Get ID" to auto-fill their Chat ID.

**Platform Admin Alerts (SuperAdmin):**
The SuperAdmin receives a Telegram notification whenever a new Free Trial is registered from the marketing website. Setup: SuperAdmin → Profile → Telegram Notifications → enter Bot Token → click "Get My ID" → Save. No configuration on the server is needed after this — it is stored in the database.

---

---

### 4.18 Nexora Marketing Website & Free Trial Flow

A full public-facing marketing website at **nexora-bcs.com** serves as the sales and onboarding front door for the platform.

**Website Sections:**
- **Hero** — animated typewriter cycling through business types (Supermarket, Café, Restaurant, Pharmacy, Boutique) with live counters (businesses, products managed, revenue processed)
- **Solutions** — three cards explaining Market POS, Café Suite, and Online Store
- **Features** — grid showcasing AI Insights, real-time sync, offline mode, multi-language, and more
- **How It Works** — 3-step illustrated guide (Create Account → Set Up Store → Go Live)
- **Pricing** — four plans with comparison details
- **Contact** — footer with links and support channels

**Free Trial Registration Flow:**

1. Visitor clicks **Start Free Trial** on the Pricing section
2. A modal opens — no redirect — collecting:
   - Full Name
   - Business Name
   - Email Address
   - WhatsApp Number
3. On submit, the backend receives the form and sends a **Telegram notification to the SuperAdmin** with all registration details
4. The SuperAdmin creates a demo account on `bcs.nexora-bcs.com` and provides credentials to the client
5. The demo account is active for **3 days**
6. After 3 days, the client receives a follow-up via WhatsApp and Telegram asking for feedback and to contact support to upgrade to a paid plan

**Pricing Plans (as shown on the website):**

| Plan | Price | Online Store | Notes |
|---|---|---|---|
| Free Trial | Free | ❌ | 3 days, demo only |
| Basic | $150 / mo | ❌ | Full POS + Café, no online storefront |
| Pro | $250 / mo | ✅ | Everything including Online Store & Delivery |
| Enterprise | Custom | ✅ | Chains, franchises, custom integrations |

**Technical notes:**
- The website is a standalone React + Vite + Tailwind app deployed separately on Railway
- Form submissions POST to `api.nexora-bcs.com/api/demo-request` — no secrets are exposed in the browser
- The SuperAdmin's Telegram bot token and chat ID are stored securely in the database

---

## 5. Demo Walkthrough — Step by Step

### Demo 1: Standard Checkout (2 minutes)

1. Open the POS screen
2. Scan a product barcode or click a category tile
3. Add 3 different products
4. Apply a 10% order discount
5. Select payment method: Split (Cash + Card)
6. Click Checkout → receipt appears on screen
7. Click Print Receipt → formatted thermal receipt opens

### Demo 2: Delivery Order Flow (3 minutes)

1. Open the online storefront URL
2. Browse products, add 2 items to cart
3. Go to checkout → enter address → pay Cash on Delivery → place order
4. Switch to admin POS → Online Orders page — new order appears
5. Click Accept → go to POS screen → cart is auto-injected
6. Complete sale as delivery type
7. Driver receives Telegram message with order details

### Demo 3: Café Table Service (3 minutes)

1. Open Café app → Floor Map shows all tables
2. Click Table 3 (green = free) → Open Table
3. Add items from menu (e.g., 2 Lattes, 1 Croissant)
4. Click Send to Kitchen
5. Switch to Kitchen Display (KDS) → items appear instantly with audio beep
6. Click each item to mark as Preparing → Ready → Served
7. Back on floor map → click Table 3 → View Bill → apply service charge → Checkout

### Demo 4: Customer QR Order (2 minutes)

1. Show the QR code printed for Table 3
2. Scan QR on phone → Café Landing page opens
3. Choose "Quick Menu" → browse items → add to cart → place order
4. On KDS: the order appears with 📱 Customer badge
5. Floor map updates: Table 3 turns orange (has customer order)

### Demo 5: AI Insights (2 minutes)

1. Go to AI Insights in sidebar
2. Click "Offer Suggestions" → AI analyzes stock and shows which products need promotions
3. Read the suggestions: each shows urgency, offer type, reasoning, expected impact
4. Click "Reorder Suggestions" → AI shows what to order, quantity, and estimated cost
5. Adjust one quantity → click "Save as Purchase Order"
6. Open Purchase Orders → track it from Pending → Approved → Ordered → Received

### Demo 6: Shift Close (2 minutes)

1. Click Shift Panel in sidebar
2. Cashier enters denomination count: 10×$1, 5×$5, 2×$10 = $60
3. Click Close Shift → system calculates expected cash
4. See variance (over/short) — if there is an unexplained difference, it is flagged
5. Shift is saved with full breakdown by payment method

### Demo 7: Gamified Loyalty (3 minutes)

1. Scan table QR → choose "Play & Earn" → Register with phone
2. Get +100 welcome points, tier = Bronze
3. Browse menu → order 3 items → earn +30 points (3 items × 10)
4. Go to Game Hub → play Slot Machine → win 50 points
5. Go to Rewards page → see available rewards
6. Next order: tap "Use Reward" → apply Free Item → checkout at 0 cost

---

## 6. Subscription Plans & Pricing

| Plan | Price | Users | Products | Online Store | Notes |
|---|---|---|---|---|---|
| Free Trial | Free | 2 | 100 | ❌ | 3-day demo, no credit card |
| Basic | $150 / mo | 10 | 1,000 | ❌ | Full POS + Café suite |
| Pro | $250 / mo | Unlimited | 5,000 | ✅ | Full system + Online Store & Delivery |
| Enterprise | Custom | Unlimited | Unlimited | ✅ | Multi-branch, custom integrations, SLA, on-site setup |

**Key distinction — Basic vs Pro:**
The Online Store & Delivery module (public storefront, customer ordering, Telegram driver dispatch) is a **Pro-only feature**. Basic plan clients get everything else: full POS, Café suite, AI insights, inventory, reports, and multi-user access.

**Module gates (SuperAdmin controls):**
- Café Module: enabled/disabled per store
- Online Store: enabled/disabled per store
- Both can be toggled independently regardless of plan — giving the SuperAdmin full control for upsell conversations

**Monthly price** is set per store in the SuperAdmin panel and tracked for billing reference. Lebanese businesses may pay in LBP at the current exchange rate.

---

## 7. Technical Stack & Deployment

### Architecture

```
Backend (Node.js + Express)
├── MongoDB (data store, fully cloud-hosted)
├── Supabase (product image storage)
├── Socket.io (real-time: floor map, KDS, order inject, cashier alert)
├── Google Gemini AI (offer & reorder AI engine)
├── Telegram Bot API (delivery notifications + free trial admin alerts)
└── JWT + device session auth

Frontend POS (React + Vite + Tailwind CSS)
├── Deployed on Vercel
├── IndexedDB offline cache (idb-keyval)
├── Dark mode + mobile bottom sheet navigation
└── Real-time socket client

Online Store Frontend (React + Vite + Zustand)
├── Deployed on Vercel
└── Mobile-first responsive design

Café App (React + Vite — standalone)
├── Staff app + Customer QR app in one deploy
├── Deployed on Railway or Vercel
└── Canvas-based scratch card game

Marketing Website (React + Vite + Tailwind CSS)
├── Public landing page at nexora-bcs.com
├── Deployed on Railway
├── Free Trial registration modal → notifies SuperAdmin via Telegram
└── No secrets in browser — all notifications go through the backend API
```

### Deployment Options

| Component | Platform | URL |
|---|---|---|
| Backend API | Railway | api.nexora-bcs.com |
| Main POS Frontend | Vercel/Railway | bcs.nexora-bcs.com |
| Online Store Frontend | Vercel/Railway | store.nexora-bcs.com |
| Café App | Railway | cafe.nexora-bcs.com |
| Marketing Website | Railway | nexora-bcs.com |
| Database | MongoDB Atlas | — |
| Image Storage | Supabase | — |

### Language & Localization
- Arabic and English interface
- All UI strings are in i18n translation files — new languages can be added without code changes
- Currency and currency symbol configurable per store
- RTL support

---

---

## 8. What's New — Version 2.1 (May 2026)

| # | Feature | Section |
|---|---|---|
| 1 | **Real-time order injection** — accepted online orders appear on the cashier's POS instantly via WebSocket | 4.1, 4.12 |
| 2 | **QR code on receipts** — every printed receipt links to the online storefront | 4.12 |
| 3 | **Delivery phone on receipts** — configurable contact number for delivery inquiries | 4.12 |
| 4 | **Online Orders notification badge** — live pending count + toast alert for new orders | 4.12 |
| 5 | **Live order status dots** — per-status counts visible on the POS sidebar without opening the panel | 4.12 |
| 6 | **BCS branded POS header** with compact LBP/USD exchange bar — editable inline | 4.1 |
| 7 | **POS product grid pagination** — 40 products per page for faster rendering | 4.1 |
| 8 | **Barcode auto-fill on unknown scan** — opens Add Product with the barcode pre-filled | 4.2 |
| 9 | **LBP input shortcuts** — type 30 to get 30,000 ل.ل; ×1000 shorthand in cash input at checkout | 4.1 |
| 10 | **Dark mode toggle** in sidebar navigation | 4.16 |
| 11 | **Mobile bottom sheet navigation** for full admin access on phones | 4.16 |
| 12 | **SuperAdmin UI/UX overhaul** — full visual redesign of the platform management panel | 4.15 |
| 13 | **Copy products between stores** — SuperAdmin can replicate a store's full catalog to another | 4.15 |
| 14 | **Kick own session** — SuperAdmin can remove their own devices from the Profile tab | 4.16 |
| 15 | **Auto-dismiss welcome banner** — fades out after 2 minutes automatically | 4.15 |
| 16 | **Nexora marketing website** — full public landing page at nexora-bcs.com | 4.18 |
| 17 | **Free Trial registration modal** — 3-day demo request form with Telegram alert to SuperAdmin | 4.18 |
| 18 | **Platform Telegram notifications** — SuperAdmin receives alerts for new trial registrations | 4.17, 4.18 |
| 19 | **Updated pricing** — Basic $150/mo (no Online Store), Pro $250/mo (with Online Store), Trial reduced to 3 days | 6 |

---

*For questions, demos, or sales inquiries, contact the development team.*

*Documentation covers MARKET-POS platform as of May 2026 — Version 2.1.*
