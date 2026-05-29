const TG_API = (token) => `https://api.telegram.org/bot${token}`;

const esc = (str) => String(str || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

// Telegram inline keyboard buttons reject localhost / 127.0.0.1 / LAN IPs
const isBotSafeUrl = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname !== "localhost"
      && hostname !== "127.0.0.1"
      && !hostname.startsWith("192.168.")
      && !hostname.startsWith("10.");
  } catch { return false; }
};

export const sendPhoto = async (botToken, chatId, photoUrl, caption = null) => {
  if (!botToken || !chatId) return null;
  const body = { chat_id: chatId, photo: photoUrl, parse_mode: "HTML" };
  if (caption) body.caption = caption;
  try {
    const res = await fetch(`${TG_API(botToken)}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (err) {
    console.error("[Telegram] sendPhoto failed:", err.message);
    return null;
  }
};

export const sendMessage = async (botToken, chatId, text, replyMarkup = null) => {
  if (!botToken || !chatId) return null;
  const body = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  try {
    const res = await fetch(`${TG_API(botToken)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (err) {
    console.error("[Telegram] sendMessage failed:", err.message);
    return null;
  }
};

export const editMessage = async (botToken, chatId, messageId, text, replyMarkup = null) => {
  if (!botToken || !chatId || !messageId) return;
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  try {
    await fetch(`${TG_API(botToken)}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {}
};

export const answerCallback = async (botToken, callbackQueryId, text, showAlert = false) => {
  try {
    await fetch(`${TG_API(botToken)}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
    });
  } catch {}
};

export const setWebhook = async (botToken, webhookUrl) => {
  const res = await fetch(`${TG_API(botToken)}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, allowed_updates: ["callback_query", "message"] }),
  });
  return res.json();
};

export const deleteWebhook = async (botToken) => {
  const res = await fetch(`${TG_API(botToken)}/deleteWebhook`);
  return res.json();
};

export const getRecentChatId = async (botToken) => {
  if (!botToken) return null;
  try {
    const res = await fetch(`${TG_API(botToken)}/getUpdates?limit=10&offset=-10`);
    const data = await res.json();
    if (!data.ok || !data.result?.length) return null;
    const last = data.result[data.result.length - 1];
    const chat = last.message?.chat || last.callback_query?.message?.chat;
    return chat ? { id: chat.id, name: chat.first_name || chat.title || String(chat.id) } : null;
  } catch {
    return null;
  }
};

// Build the "new order" message sent to each driver individually.
// acceptUrl is unique per driver (contains their chatId as a query param).
export const buildDispatchMessage = (order, acceptUrl) => {
  const items = (order.items || [])
    .map(i => `  • ${esc(i.name)} × ${i.quantity}  —  $${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");

  const address     = esc(order.customer?.address || "—");
  const description = esc(order.customer?.locationDescription || "");
  const name        = esc(order.customer?.name || "");
  const phone       = esc(order.customer?.phone || "—");
  const lat = order.customer?.lat;
  const lng = order.customer?.lng;
  const gpsLine = lat && lng
    ? `\n🗺 <a href="https://maps.google.com/?q=${lat},${lng}">Open in Maps</a>`
    : "";

  const safeUrl    = isBotSafeUrl(acceptUrl);
  const acceptLine = safeUrl
    ? ""
    : `\n\n🔗 <a href="${acceptUrl.replace(/&/g, "&amp;")}">Tap here to accept</a>`;

  const text =
`🚚 <b>New Delivery Order — ${esc(order.orderNumber)}</b>

👤 <b>${name}</b>
📞 <a href="tel:${phone}">${phone}</a>
📍 ${address}${description ? `\n🏢 ${description}` : ""}${gpsLine}

<b>Items:</b>
${items}
${order.deliveryFee > 0 ? `\n🚗 Delivery: $${order.deliveryFee.toFixed(2)}` : ""}
💵 <b>Total: $${order.total.toFixed(2)}</b>

Be the first to accept!${acceptLine}`;

  const replyMarkup = safeUrl ? {
    inline_keyboard: [[{ text: "🙋 Accept This Order", url: acceptUrl }]],
  } : null;

  return { text, replyMarkup };
};

// Build the confirmation message sent only to the accepting driver.
// deliveryPageUrl is the link to press "Money Collected".
export const buildDriverConfirmMessage = (order, deliveryPageUrl) => {
  const address     = esc(order.customer?.address || "—");
  const description = esc(order.customer?.locationDescription || "");
  const custName    = esc(order.customer?.name || "");
  const phone       = esc(order.customer?.phone || "—");
  const lat = order.customer?.lat;
  const lng = order.customer?.lng;

  const text =
`✅ <b>You accepted ${esc(order.orderNumber)}!</b>

👤 ${custName}
📞 <a href="tel:${phone}">${phone}</a>
📍 ${address}${description ? `\n🏢 ${description}` : ""}
💵 <b>Collect: $${order.total.toFixed(2)}</b>

Tap below when you collect the cash.`;

  const buttons = [];
  if (lat && lng) {
    buttons.push({ text: "📍 Navigate", url: `https://maps.google.com/?q=${lat},${lng}` });
  } else if (address && address !== "—") {
    buttons.push({ text: "📍 Navigate", url: `https://maps.google.com/?q=${encodeURIComponent(address)}` });
  }

  const safeDeliveryUrl = isBotSafeUrl(deliveryPageUrl);
  if (safeDeliveryUrl) {
    buttons.push({ text: "💵 Money Collected", url: deliveryPageUrl });
  }

  const replyMarkup = buttons.length ? { inline_keyboard: [buttons] } : null;

  // For dev (localhost), include money-collected link as text
  const collectLine = safeDeliveryUrl
    ? ""
    : `\n🔗 <a href="${deliveryPageUrl.replace(/&/g, "&amp;")}">Tap here when you collect the cash</a>`;

  return {
    text: text + collectLine,
    replyMarkup,
  };
};
