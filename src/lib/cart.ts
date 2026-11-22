import { useSyncExternalStore } from "react";

import type { ItemType } from "@/lib/labman";

export type CartItem = { type: ItemType; id: string; name: string; unit: string; max: number; quantity: number };
export type Cart = { labId: string | null; labName: string | null; items: CartItem[] };

const KEY = "labvir-cart";
const EMPTY: Cart = { labId: null, labName: null, items: [] };
let cache: Cart | null = null;
const listeners = new Set<() => void>();

function read(): Cart {
  if (cache) return cache;
  try {
    cache = typeof window === "undefined" ? EMPTY : ((JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Cart | null) ?? EMPTY);
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: Cart) {
  cache = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export const cart = {
  /** A cart holds items from one laboratory, since one borrowing belongs to one lab. */
  add(lab: { id: string; name: string }, item: Omit<CartItem, "quantity">, quantity = 1) {
    const c = read();
    const base = c.labId === lab.id ? c : { labId: lab.id, labName: lab.name, items: [] };
    const existing = base.items.find((i) => i.id === item.id && i.type === item.type);
    const items = existing
      ? base.items.map((i) => (i === existing ? { ...i, max: item.max, quantity: Math.min(item.max, i.quantity + quantity) } : i))
      : [...base.items, { ...item, quantity: Math.min(item.max, quantity) }];
    write({ ...base, items });
  },
  setQuantity(type: ItemType, id: string, quantity: number) {
    const c = read();
    write({ ...c, items: c.items.map((i) => (i.id === id && i.type === type ? { ...i, quantity: Math.max(1, Math.min(i.max, quantity)) } : i)) });
  },
  remove(type: ItemType, id: string) {
    const c = read();
    const items = c.items.filter((i) => !(i.id === id && i.type === type));
    write(items.length ? { ...c, items } : EMPTY);
  },
  clear() {
    write(EMPTY);
  },
};

export function useCart(): Cart {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
}
