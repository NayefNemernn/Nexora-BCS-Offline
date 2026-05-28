import { useState } from "react";
import toast from "react-hot-toast";

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

      // new item
      return [
        ...prev,
        {
          productId: product._id,
          name:      product.name,
          price:     product.price,
          stock:     product.stock,
          image:     product.image || "",
          quantity:  1,
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
          item.productId === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

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
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return {
    cart,
    addToCart,
    increase,
    decrease,
    clearCart,
    loadCart,
    loadDeliveryOrder,
    total
  };
};