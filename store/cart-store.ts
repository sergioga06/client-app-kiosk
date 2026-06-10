import { create } from 'zustand';

// Definimos cómo es una línea del carrito
export interface CartItem {
  cartItemId: string; // Un ID único temporal para esta fila del carrito
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  customizations: {
    added: string[];    // UUIDs de ingredientes extra
    removed: string[];  // UUIDs de ingredientes quitados
  };
  finalPrice: number;   // Precio base + extras
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  // Añadir un producto al carrito
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  
  // Quitar un producto del carrito
  removeItem: (cartItemId) => set((state) => ({ 
    items: state.items.filter(i => i.cartItemId !== cartItemId) 
  })),
  
  // Vaciar el carrito tras pagar
  clearCart: () => set({ items: [] }),
  
  // Calcular el total de la factura
  getTotal: () => {
    const total = get().items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    return parseFloat(total.toFixed(2));
  }
}));