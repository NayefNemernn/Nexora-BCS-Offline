// Uses Gemini REST API directly (v1) — avoids the SDK's v1beta default
// which doesn't support the newer model names.

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const MODEL = "gemini-2.5-flash-lite";

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a product data extraction assistant for a Point-of-Sale system used in Lebanon.
The user will describe a product in English, Arabic, or a mix of both (including Lebanese colloquial Arabic).

Extract the product information and return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Return exactly this JSON structure:
{
  "name": "product name in English",
  "price": 0,
  "cost": 0,
  "stock": 0,
  "category": "category name or null",
  "expiryDate": "YYYY-MM-DD or null",
  "priceCurrency": "USD"
}

Rules:
- name: Translate to English if the input is in Arabic. Keep it clean and concise.
- price: The selling/retail price as a plain number (no symbols). Default 0 if not mentioned.
- cost: The purchase/wholesale/cost price as a plain number. Default 0 if not mentioned.
- stock: Quantity as a whole integer. Default 0 if not mentioned.
- category: Infer from the product type if not explicitly stated.
    Examples: Pepsi/Juice/Water → "Beverages", Chips/Biscuits → "Snacks",
    Panadol/medicine → "Medicine", Shampoo/soap → "Personal Care",
    Milk/Cheese/Yogurt → "Dairy", Bread/Cake → "Bakery",
    Phone accessories → "Electronics", Cleaning products → "Cleaning".
    Return null if you cannot infer it.
- expiryDate: In YYYY-MM-DD format. If the user says a month/year like "March 2026", use the last day of that month. Return null if not mentioned.
- priceCurrency: "USD" if price is in dollars, "LBP" if price is in Lebanese Pounds (ل.ل, lira, ليرة). Default "USD".

Important: Return ONLY the JSON object — nothing else, no markdown fences.`;

// ── Controller ────────────────────────────────────────────────────────────────
export const parseProductPrompt = async (req, res) => {
  try {
    const { prompt, categories } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return res.status(503).json({ message: "AI service not configured — add GEMINI_API_KEY to server .env" });
    }

    const response = await fetch(`${GEMINI_URL(MODEL)}?key=${apiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || "Gemini API error";
      if (response.status === 429) {
        return res.status(429).json({ message: "AI rate limit reached. Please wait a moment and try again." });
      }
      if (response.status === 400 && msg.toLowerCase().includes("api key")) {
        return res.status(503).json({ message: "Invalid Gemini API key. Check GEMINI_API_KEY in server .env" });
      }
      return res.status(502).json({ message: `AI error: ${msg}` });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    // Strip markdown fences if model wraps in ```json ... ```
    const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ message: "Could not extract product data. Try being more specific." });
    }

    const fields = JSON.parse(jsonMatch[0]);

    // Sanitise
    fields.price = Math.max(0, parseFloat(fields.price) || 0);
    fields.cost  = Math.max(0, parseFloat(fields.cost)  || 0);
    fields.stock = Math.max(0, parseInt(fields.stock)    || 0);
    if (!["USD", "LBP"].includes(fields.priceCurrency)) fields.priceCurrency = "USD";

    // Category matching — if store categories were provided, match AI suggestion
    if (Array.isArray(categories) && categories.length > 0 && fields.category) {
      const suggested = fields.category.toLowerCase().trim();
      const match = categories.find(c => c.toLowerCase().trim() === suggested);
      fields.category = match || null; // exact match → use store name; no match → null
    }

    res.json(fields);
  } catch (err) {
    console.error("[AI] parseProductPrompt error:", err.message);
    res.status(500).json({ message: "AI parsing failed. Please try again." });
  }
};
