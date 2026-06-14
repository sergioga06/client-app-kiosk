import { create } from 'zustand';

// Definimos cómo es una línea del carrito
export interface CartItem {
  cartItemId: string; // Un ID único temporal para esta fila del carrito
  productId: string;
  name: string;
  basePrice: number;
  extraPrice: number;
  quantity: number;
  customizations?: {
    added: string[];
    removed: string[];
  };
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
    // 👇 EL CÁLCULO REPARADO: Suma el precio base más los extras
    const total = get().items.reduce((sum, item) => {
      const itemTotal = (item.basePrice + (item.extraPrice || 0)) * item.quantity;
      return sum + itemTotal;
    }, 0);
    
    return parseFloat(total.toFixed(2));
  }
}));