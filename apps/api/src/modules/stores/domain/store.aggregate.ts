import {
  type Currency,
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings,
  storeSlugSchema,
  type UpdateStoreInput,
} from '@marche/contracts';
import { AggregateRoot } from '../../../shared/domain/aggregate-root.js';
import { createEvent } from '../../../shared/domain/domain-event.js';
import { ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';

export interface StoreProps {
  clerkOrgId: string;
  name: string;
  slug: string;
  currency: Currency;
  country: string;
  timezone: string;
  contactEmail: string | null;
  phone: string | null;
  logoMediaId: string | null;
  shippingSettings: ShippingSettings;
  lowStockDefault: number;
  createdAt: Date;
  archivedAt: Date | null;
}

const TIMEZONE_BY_COUNTRY: Record<string, string> = {
  FR: 'Europe/Paris',
  BE: 'Europe/Brussels',
  CH: 'Europe/Zurich',
  LU: 'Europe/Luxembourg',
  SN: 'Africa/Dakar',
  CI: 'Africa/Abidjan',
  ML: 'Africa/Bamako',
  BF: 'Africa/Ouagadougou',
  BJ: 'Africa/Porto-Novo',
  TG: 'Africa/Lome',
  NE: 'Africa/Niamey',
  CM: 'Africa/Douala',
  GA: 'Africa/Libreville',
  CG: 'Africa/Brazzaville',
  CD: 'Africa/Kinshasa',
  MA: 'Africa/Casablanca',
  TN: 'Africa/Tunis',
  DZ: 'Africa/Algiers',
  CA: 'America/Toronto',
  US: 'America/New_York',
  GB: 'Europe/London',
};

export function defaultTimezoneFor(country: string): string {
  return TIMEZONE_BY_COUNTRY[country.toUpperCase()] ?? 'UTC';
}

/** Boutique = tenant. Une organisation Clerk correspond à une boutique. */
export class Store extends AggregateRoot {
  private constructor(
    id: string,
    private props: StoreProps,
  ) {
    super(id);
  }

  static create(
    input: {
      clerkOrgId: string;
      name: string;
      slug: string;
      currency: Currency;
      country: string;
      timezone?: string;
    },
    now: Date,
  ): Store {
    const slug = storeSlugSchema.safeParse(input.slug);
    if (!slug.success) {
      throw new ValidationError('VALIDATION_FAILED', slug.error.issues[0]?.message ?? 'Adresse invalide');
    }
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ValidationError('VALIDATION_FAILED', 'Le nom de la boutique doit faire de 2 à 80 caractères');
    }
    const country = input.country.toUpperCase();
    const store = new Store(newId(), {
      clerkOrgId: input.clerkOrgId,
      name,
      slug: slug.data,
      currency: input.currency,
      country,
      timezone: input.timezone ?? defaultTimezoneFor(country),
      contactEmail: null,
      phone: null,
      logoMediaId: null,
      shippingSettings: DEFAULT_SHIPPING_SETTINGS,
      lowStockDefault: 5,
      createdAt: now,
      archivedAt: null,
    });
    store.record(
      createEvent(
        'stores.store.created',
        store.id,
        store.id,
        { name, slug: slug.data, currency: input.currency, country },
        now,
      ),
    );
    return store;
  }

  static reconstitute(id: string, props: StoreProps): Store {
    return new Store(id, { ...props });
  }

  get clerkOrgId(): string {
    return this.props.clerkOrgId;
  }

  get slug(): string {
    return this.props.slug;
  }

  get isArchived(): boolean {
    return this.props.archivedAt !== null;
  }

  snapshot(): Readonly<StoreProps> {
    return { ...this.props };
  }

  update(patch: UpdateStoreInput, now: Date): void {
    const changed = Object.keys(patch);
    if (changed.length === 0) return;
    this.props = {
      ...this.props,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.contactEmail !== undefined ? { contactEmail: patch.contactEmail } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.logoMediaId !== undefined ? { logoMediaId: patch.logoMediaId } : {}),
      ...(patch.shippingSettings !== undefined ? { shippingSettings: patch.shippingSettings } : {}),
      ...(patch.lowStockDefault !== undefined ? { lowStockDefault: patch.lowStockDefault } : {}),
    };
    this.record(createEvent('stores.store.updated', this.id, this.id, { changed }, now));
  }

  archive(now: Date): void {
    if (this.props.archivedAt) return;
    this.props = { ...this.props, archivedAt: now };
    this.record(createEvent('stores.store.archived', this.id, this.id, {}, now));
  }
}
