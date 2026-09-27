import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../../../shared/infrastructure/redis/redis.module.js';
import { CartRepository } from '../application/cart.repository.js';
import { Cart, type CartData } from '../domain/cart.js';

const TTL_SECONDS = 7 * 24 * 60 * 60;

const key = (storeId: string, cartId: string) => `cart:${storeId}:${cartId}`;

/** La clé inclut la boutique : un identifiant de panier ne fonctionne que sur son site. */
@Injectable()
export class RedisCartRepository extends CartRepository {
  constructor(@Inject(REDIS) private readonly redis: Redis) {
    super();
  }

  async find(storeId: string, cartId: string): Promise<Cart | null> {
    const raw = await this.redis.getex(key(storeId, cartId), 'EX', TTL_SECONDS);
    return raw ? Cart.fromData(JSON.parse(raw) as CartData) : null;
  }

  async save(cart: Cart): Promise<void> {
    await this.redis.set(key(cart.storeId, cart.id), JSON.stringify(cart.toData()), 'EX', TTL_SECONDS);
  }

  async delete(storeId: string, cartId: string): Promise<void> {
    await this.redis.del(key(storeId, cartId));
  }
}
