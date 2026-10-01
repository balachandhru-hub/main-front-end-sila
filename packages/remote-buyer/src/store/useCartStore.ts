import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BuyerCatalogResponse } from '../api/Buyerapi';

/** A Product Catalog product in the cart, waiting to be added to a wishlist. */
export interface CartProduct {
  catalogId: string;
  catalogName: string;
  supplierName: string;
  price: number;
  currency: string;
  unitOfMeasure: string;
  /** First image of the product, loaded on demand for the cart thumbnail. */
  imageAssetId: string | null;
  quantity: number;
}

/** Cart products on their way into a wishlist: a new one (wishlistId null) or an existing draft. */
export interface CartWishlistHandoff {
  wishlistId: string | null;
  catalogIds: string[];
}

export interface CartState {
  products: CartProduct[];
  handoff: CartWishlistHandoff | null;
  addProduct: (product: BuyerCatalogResponse) => void;
  removeProducts: (catalogIds: string[]) => void;
  setQuantity: (catalogId: string, quantity: number) => void;
  startWishlist: (handoff: CartWishlistHandoff) => void;
  clearHandoff: () => void;
  clear: () => void;
}

// Catalog -> cart -> wishlist are separate dashboard sections, so the cart lives here instead of
// in any one component. It is kept in sessionStorage so a page reload does not empty it; logout clears it.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      products: [],
      handoff: null,

      addProduct: (product) => {
        set((state) => {
          if (state.products.some((item) => item.catalogId === product.catalogId)) return state;
          return {
            products: [
              ...state.products,
              {
                catalogId: product.catalogId,
                catalogName: product.catalogName,
                supplierName: product.supplierName,
                price: product.price,
                currency: product.currency,
                unitOfMeasure: product.unitOfMeasure,
                imageAssetId: product.asset?.[0]?.id ?? null,
                quantity: 1,
              },
            ],
          };
        });
      },

      removeProducts: (catalogIds) => {
        set((state) => ({ products: state.products.filter((item) => !catalogIds.includes(item.catalogId)) }));
      },

      setQuantity: (catalogId, quantity) => {
        set((state) => ({
          products: state.products.map((item) => (item.catalogId === catalogId ? { ...item, quantity } : item)),
        }));
      },

      startWishlist: (handoff) => {
        set({ handoff });
      },

      clearHandoff: () => {
        set({ handoff: null });
      },

      clear: () => {
        set({ products: [], handoff: null });
      },
    }),
    {
      name: 'vosox-buyer-cart',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ products: state.products }),
    },
  ),
);

if (typeof window !== 'undefined') {
  window.addEventListener('session:expired', () => {
    useCartStore.getState().clear();
  });
}
