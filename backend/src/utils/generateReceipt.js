/**
 * Generates a plain-text receipt string for a completed sale.
 * Used for printing or storing alongside the sale record.
 */
export function generateReceipt(sale) {
  const line  = "─".repeat(32);
  const pad   = (label, value, width = 32) => {
    const gap = width - label.length - value.length;
    return label + " ".repeat(Math.max(1, gap)) + value;
  };

  const date = new Date(sale.createdAt || Date.now()).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines = [
    "         MARKET POS",
    line,
    `Date:    ${date}`,
    `Receipt: ${sale._id?.toString().slice(-8).toUpperCase() ?? "N/A"}`,
    `Cashier: ${sale.username ?? "Staff"}`,
    line,
  ];

  for (const item of sale.items ?? []) {
    lines.push(`${item.name}`);
    lines.push(
      pad(
        `  ${item.quantity} x $${item.price.toFixed(2)}`,
        `$${item.subtotal.toFixed(2)}`
      )
    );
  }

  lines.push(line);
  lines.push(pad("TOTAL", `$${sale.total.toFixed(2)}`));

  if (sale.paymentMethod) {
    lines.push(pad("Payment", sale.paymentMethod.toUpperCase()));
  }

  if (sale.paymentMethod === "paylater") {
    lines.push(pad("Status", "UNPAID — PAY LATER"));
  }

  if (sale.customerName) {
    lines.push(pad("Customer", sale.customerName));
  }

  lines.push(line);
  lines.push("     Thank you for shopping!");
  lines.push("");

  return lines.join("\n");
}