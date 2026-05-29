import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      token:    null,
      customer: null,
      setAuth:        (token, customer) => set({ token, customer }),
      updateCustomer: (customer)        => set({ customer }),
      logout:         ()                => set({ token: null, customer: null }),
    }),
    { name: "nexora-customer-auth" }
  )
);
