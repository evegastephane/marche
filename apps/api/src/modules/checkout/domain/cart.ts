import { MAX_CART_LINE_QUANTITY, MAX_CART_LINES } from '@marche/contracts';
import { NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export interface CartLine {
  variantId: string;
  quantity: number;
  /** Dernier prix montré à l'acheteur (sert à détecter un changement de prix au checkout). */
  unitPriceAmount: number;
}

export interface CartData {
  id: string;
  storeId: string;
  lines: CartLine[];
  createdAt: string;
  updatedAt: string;
}

/** Panier d'un acheteur anonyme, conservé 7 jours dans Redis. */
export class Cart {
  private constructor(private data: CartData) {}

  static create(storeId: string, now: Date): Cart {
    const at = now.toISOString();
    return new Cart({ id: newId(), storeId, lines: [], createdAt: at, updatedAt: at });
  }

  static fromData(data: CartData): Cart {
    return new Cart({ ...data, lines: data.lines.map((line) => ({ ...line })) });
  }

  get id(): string {
    return this.data.id;
  }

  get storeId(): string {
    return this.data.storeId;
  }

  get lines(): readonly CartLine[] {
    return this.data.lines;
  }

  get isEmpty(): boolean {
    return this.data.lines.length === 0;
  }

  toData(): CartData {
    return { ...this.data, lines: this.data.lines.map((line) => ({ ...line })) };
  }

  /** Ajoute ou cumule (plafonné à 99 par ligne, 50 lignes maximum). */
  addLine(variantId: string, quantity: number, unitPriceAmount: number, now: Date): void {
    assertQuantity(quantity, 1);
    const existing = this.data.lines.find((line) => line.variantId === variantId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, MAX_CART_LINE_QUANTITY);
      existing.unitPriceAmount = unitPriceAmount;
    } else {
      if (this.data.lines.length >= MAX_CART_LINES) {
        throw new ValidationError('VALIDATION_FAILED', `Le panier est limité à ${MAX_CART_LINES} articles différents`);
      }
      this.data.lines.push({ variantId, quantity, unitPriceAmount });
    }
    this.touch(now);
  }

  /** 0 retire la ligne. */
  setQuantity(variantId: string, quantity: number, now: Date): void {
    assertQuantity(quantity, 0);
    const line = this.data.lines.find((l) => l.variantId === variantId);
    if (!line) throw new NotFoundError('Article du panier', variantId);
    if (quantity === 0) this.data.lines = this.data.lines.filter((l) => l.variantId !== variantId);
    else line.quantity = quantity;
    this.touch(now);
  }

  removeLine(variantId: string, now: Date): void {
    this.data.lines = this.data.lines.filter((line) => line.variantId !== variantId);
    this.touch(now);
  }

  /** Aligne le prix mémorisé sur le prix actuel ; vrai si quelque chose a changé. */
  refreshPrice(variantId: string, unitPriceAmount: number, now: Date): boolean {
    const line = this.data.lines.find((l) => l.variantId === variantId);
    if (!line || line.unitPriceAmount === unitPriceAmount) return false;
    line.unitPriceAmount = unitPriceAmount;
    this.touch(now);
    return true;
  }

  private touch(now: Date): void {
    this.data.updatedAt = now.toISOString();
  }
}

function assertQuantity(quantity: number, min: number): void {
  if (!Number.isInteger(quantity) || quantity < min || quantity > MAX_CART_LINE_QUANTITY) {
    throw new ValidationError('VALIDATION_FAILED', `Quantité invalide (${min} à ${MAX_CART_LINE_QUANTITY})`);
  }
}
