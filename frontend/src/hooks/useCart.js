import { useState } from "react";
import toast from "react-hot-toast";
import { normalizeUnit, isWeighed, lineTotal } from "../lib/quantity";

export const useCart = () => {
  const [cart, setCart] = useState([]);

  /* ======================
     ADD TO CART
  ====================== */
  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find(
        (item) => item.productId === product._id
      );

      // already in cart
      if (exists) {
        // Sold by weight / volume — the amount is typed on the cart line,
        // so tapping the product again doesn't add "one more".
        if (isWeighed(exists.unitType)) return prev;

        // 🚫 prevent exceeding stock
        if (exists.quantity >= product.stock) {
          toast.error(`⚠️ Only ${product.stock} in stock`);
          return prev;
        }

        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const unitType = normalizeUnit(product.unitType);

      // new item
      return [
        ...prev,
        {
          productId: product._id,
          name:      product.name,
          price:     product.price,
          stock:     product.stock,
          image:     product.image || "",
          // kg / L lines start empty (0) until the cashier enters the amount
          quantity:  isWeighed(unitType) ? 0 : 1,
          unitType,
          vatExempt: product.vatExempt || false,
        }
      ];
    });
  };

  /* ======================
     INCREASE QTY
  ====================== */
  const increase = (id) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === id) {
          if (isWeighed(item.unitType)) return item; // amount is typed, not stepped
          if (item.quantity >= item.stock) {
            toast.error(`⚠️ Only ${item.stock} in stock`);
            return item;
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      })
    );
  };

  /* ======================
     DECREASE QTY
  ====================== */
  const decrease = (id) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === id && !isWeighed(item.unitType)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0 || isWeighed(item.unitType))
    );
  };

  /* ======================
     SET QTY (kg / L lines)
     `quantity` is an already-validated amount in the product's unit
     (see parseQuantityInput), or 0 while the field is empty / invalid.
     Returns false if it was refused for exceeding stock.
  ====================== */
  const setQuantity = (id, quantity) => {
    const item = cart.find((i) => i.productId === id);
    if (!item) return false;
    if (quantity > item.stock) return false; // the cart line shows the reason
    setCart((prev) =>
      prev.map((i) => (i.productId === id ? { ...i, quantity } : i))
    );
    return true;
  };

  /* ======================
     REMOVE LINE
  ====================== */
  const removeItem = (id) =>
    setCart((prev) => prev.filter((item) => item.productId !== id));

  /* ======================
     LOAD DELIVERY ORDER
  ====================== */
  const loadDeliveryOrder = (orderItems) => {
    // orderItems: [{ productId, name, price, quantity, subtotal }]
    setCart(orderItems.map(item => ({
      productId: item.productId,
      name:      item.name,
      price:     item.price,
      stock:     item.quantity + 99, // treat stock as sufficient (already validated)
      image:     "",
      quantity:  item.quantity,
      unitType:  normalizeUnit(item.unitType),
    })));
  };

  /* ======================
     LOAD CART (hold/resume)
  ====================== */
  const loadCart = (items) => setCart(items.map(i => ({ ...i })));

  /* ======================
     CLEAR CART
  ====================== */
  const clearCart = () => setCart([]);

  /* ======================
     TOTAL
  ====================== */
  const total = cart.reduce(
    (sum, item) => sum + lineTotal(item.price, item.quantity, item.unitType),
    0
  );

  return {
    cart,
    addToCart,
    increase,
    decrease,
    setQuantity,
    removeItem,
    clearCart,
    loadCart,
    loadDeliveryOrder,
    total
  };
};
