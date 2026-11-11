/* Atomic stock change that keeps the stored number at 3 decimals.

   A plain { $inc } on a fractional amount (0.35 kg) leaves float drift in
   the database — 10 - 0.35 - 0.35 … ends up as 8.950000000000001 — so the
   add and the rounding happen together in one update pipeline. Whole
   numbers come out exactly as { $inc } would leave them.

   Usage: Product.findByIdAndUpdate(id, incRounded("stock", -quantity))   */
export const incRounded = (field, delta) => [
  { $set: { [field]: { $round: [{ $add: [{ $ifNull: [`$${field}`, 0] }, delta] }, 3] } } },
];
