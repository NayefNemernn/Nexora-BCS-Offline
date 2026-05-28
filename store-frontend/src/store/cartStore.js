import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      slug:  "",

      setSlug: (slug) => set({ slug }),

      addItem: (product) => {
        const items = get().items;
        const idx   = items.findIndex(i => i.productId === product._id);
        if (idx >= 0) {
          const updated = [...items];
          updated[idx]  = { ...updated[idx], quantity: updated[idx].quantity + 1 };
          set({ items: updated });
        } else {
          set({
            items: [...items, {
              productId: product._id,
              name:      product.name,
              price:     product.price,
              image:     product.imageUrl || product.image || "",
              stock:     product.stock,
              quantity:  1,
            }],
          });
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.productId !== productId) }),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter(i => i.productId !== productId) });
          return;
        }
        set({
          items: get().items.map(i =>
            i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    { name: "nexora-cart" }
  )
);

// Derived selectors (computed outside state so reactivity works correctly)
export const selectTotal     = (s) => s.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
export const selectItemCount = (s) => s.items.reduce((acc, i) => acc + i.quantity, 0);
