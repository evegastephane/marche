/**
 * Catalogue d'une boutique chargé en mémoire, pour les scripts (seed, reprise) : crée à la volée
 * les attributs, valeurs et liens qui manquent. Hors API : pas d'extension tenant, storeId explicite.
 */
import { type AttributeType, valueCode, valueKey } from '@marche/contracts';
import { v7 as uuidv7 } from 'uuid';
import type { Prisma } from '../../src/generated/prisma/client.js';

export type Tx = Prisma.TransactionClient;

export interface AttributeDef {
  slug: string;
  name: string;
  type: AttributeType;
  unit?: string;
  isVariantAxis?: boolean;
}

export interface AttributeState {
  id: string;
  slug: string;
  type: AttributeType;
  isVariantAxis: boolean;
  /** valueKey → libellé enregistré */
  values: Map<string, string>;
}

export class StoreTaxonomy {
  private constructor(
    private readonly tx: Tx,
    private readonly storeId: string,
    readonly categories: Map<string, { id: string; tracksUnits: boolean }>,
    private readonly attributes: Map<string, AttributeState>,
    private readonly links: Set<string>,
  ) {}

  static async load(tx: Tx, storeId: string): Promise<StoreTaxonomy> {
    const [categories, attributes, links] = await Promise.all([
      tx.category.findMany({ where: { storeId }, select: { id: true, slug: true, parentId: true, tracksUnits: true } }),
      tx.attribute.findMany({ where: { storeId }, include: { values: true } }),
      tx.categoryAttribute.findMany({ where: { storeId }, select: { categoryId: true, attributeId: true } }),
    ]);
    // Suivi à l'unité hérité des parents.
    const byId = new Map(categories.map((c) => [c.id, c]));
    const tracks = (id: string | null): boolean => {
      for (let current = id ? byId.get(id) : undefined; current; current = current.parentId ? byId.get(current.parentId) : undefined) {
        if (current.tracksUnits) return true;
      }
      return false;
    };
    return new StoreTaxonomy(
      tx,
      storeId,
      new Map(categories.map((c) => [c.slug, { id: c.id, tracksUnits: tracks(c.id) }])),
      new Map(
        attributes.map((a) => [
          a.slug,
          {
            id: a.id,
            slug: a.slug,
            type: a.type,
            isVariantAxis: a.isVariantAxis,
            values: new Map(a.values.map((v) => [valueKey(v.value), v.value])),
          },
        ]),
      ),
      new Set(links.map((l) => `${l.categoryId}|${l.attributeId}`)),
    );
  }

  /** Attribut existant de la boutique. */
  get(slug: string): AttributeState | undefined {
    return this.attributes.get(slug);
  }

  async attribute(def: AttributeDef): Promise<AttributeState> {
    const existing = this.attributes.get(def.slug);
    if (existing) return existing;
    const id = uuidv7();
    await this.tx.attribute.create({
      data: {
        id,
        storeId: this.storeId,
        slug: def.slug,
        name: def.name,
        type: def.type,
        unit: def.unit ?? (def.type === 'NUMBER' ? '—' : null),
        isVariantAxis: def.isVariantAxis ?? false,
        position: this.attributes.size,
      },
    });
    const created: AttributeState = { id, slug: def.slug, type: def.type, isVariantAxis: def.isVariantAxis ?? false, values: new Map() };
    this.attributes.set(def.slug, created);
    return created;
  }

  /** Libellé enregistré d'une valeur de liste, ajoutée si elle manque. */
  async value(attribute: AttributeState, value: string, swatch?: string): Promise<string> {
    const label = value.trim();
    const known = attribute.values.get(valueKey(label));
    if (known) return known;
    await this.tx.attributeValue.create({
      data: {
        storeId: this.storeId,
        attributeId: attribute.id,
        value: label,
        code: valueCode(label),
        swatch: swatch && /^#[0-9A-Fa-f]{6}$/.test(swatch) ? swatch : null,
        position: attribute.values.size,
      },
    });
    attribute.values.set(valueKey(label), label);
    return label;
  }

  async link(categoryId: string, attribute: AttributeState): Promise<void> {
    const key = `${categoryId}|${attribute.id}`;
    if (this.links.has(key)) return;
    await this.tx.categoryAttribute.create({
      data: { storeId: this.storeId, categoryId, attributeId: attribute.id, position: 100 + this.links.size },
    });
    this.links.add(key);
  }
}
