"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  restaurantId: number;
  restaurantName: string;
  imageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string;
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: "",
      addItem: (newItem) => {
        const { items, restaurantId } = get();

        // If different restaurant, clear cart first
        if (restaurantId && restaurantId !== newItem.restaurantId) {
          set({
            items: [newItem],
            restaurantId: newItem.restaurantId,
            restaurantName: newItem.restaurantName,
          });
          return;
        }

        const existing = items.find((i) => i.id === newItem.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === newItem.id
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            ),
          });
        } else {
          set({
            items: [...items, newItem],
            restaurantId: newItem.restaurantId,
            restaurantName: newItem.restaurantName,
          });
        }
      },
      removeItem: (id) => {
        const newItems = get().items.filter((i) => i.id !== id);
        set({
          items: newItems,
          restaurantId: newItems.length === 0 ? null : get().restaurantId,
        });
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        });
      },
      clearCart: () => set({ items: [], restaurantId: null, restaurantName: "" }),
      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "tkg-cart" }
  )
);
