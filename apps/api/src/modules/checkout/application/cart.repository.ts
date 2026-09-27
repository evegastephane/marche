import type { Cart } from '../domain/cart.js';

/** Paniers (Redis, expiration glissante de 7 jours). */
export abstract class CartRepository {
  abstract find(storeId: string, cartId: string): Promise<Cart | null>;
  abstract save(cart: Cart): Promise<void>;
  abstract delete(storeId: string, cartId: string): Promise<void>;
}
