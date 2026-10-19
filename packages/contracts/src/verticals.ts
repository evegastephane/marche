import { z } from 'zod';

/**
 * Types de boutique (« verticales ») et réglages propres à chacun : services affichés sur le site
 * (garantie, états, reprise, échange de taille…) et guides des tailles par catégorie. Le catalogue
 * lui-même (catégories, attributs) vit dans taxonomy.ts ; le vocabulaire du site dans storefront-vocabulary.ts.
 */

// ───────────── Types de boutique ─────────────

export const STORE_TYPES = ['FASHION', 'ELECTRONICS'] as const;
export const storeTypeSchema = z.enum(STORE_TYPES);
export type StoreType = z.infer<typeof storeTypeSchema>;

export const STORE_TYPE_LABELS: Record<StoreType, { label: string; description: string }> = {
  FASHION: {
    label: 'Mode',
    description: 'Vêtements, chaussures, sacs et accessoires : tailles, pointures, couleurs, guide des tailles.',
  },
  ELECTRONICS: {
    label: 'Électronique',
    description: 'Téléphones, ordinateurs et accessoires : stockage, état neuf ou reconditionné, fiche technique.',
  },
};

// ───────────── États (boutique Tech) ─────────────

/** Explication de l'état, affichée sous les cartes « État » du site (la boutique peut la réécrire). */
export const CONDITION_HINTS: Record<string, string> = {
  Neuf: 'Jamais utilisé, emballage d’origine.',
  'Open box': 'Déballé mais jamais utilisé : ouvert pour une démonstration ou un retour, vendu complet.',
  'Reconditionné – Excellent': 'Comme neuf : aucune trace visible, testé et garanti.',
  'Reconditionné – Très bon': 'Micro-rayures à peine visibles, parfaitement fonctionnel.',
  'Reconditionné – Bon': 'Traces d’usage visibles, parfaitement fonctionnel. Le meilleur prix.',
  Occasion: 'Déjà utilisé, vendu en l’état après vérification du fonctionnement.',
};

const choice = (value: string, label = value) => ({ value, label });

/** Rayons du site Mode (réglage « rayons »), dans l'ordre d'affichage. */
export const AUDIENCES = [
  choice('FEMME', 'Femme'),
  choice('HOMME', 'Homme'),
  choice('ENFANT', 'Enfant'),
  choice('MIXTE', 'Mixte'),
];

// ───────────── Guides des tailles ─────────────

export const sizeGuideSchema = z.object({
  title: z.string().trim().min(1).max(80),
  columns: z.array(z.string().trim().min(1).max(40)).min(2).max(8),
  rows: z.array(z.array(z.string().trim().max(40)).min(2).max(8)).min(1).max(30),
  note: z.string().trim().max(300).optional(),
});
export type SizeGuide = z.infer<typeof sizeGuideSchema>;

/** Anciennes clés (avant les catégories) → catégorie du modèle Mode qui les remplace. */
const LEGACY_GUIDE_KEYS: Record<string, string> = { CLOTHING: 'vetements', SHOES: 'chaussures' };

/**
 * Guides des tailles par catégorie (slug) : un guide vaut pour la catégorie et ses sous-catégories.
 * Les réglages enregistrés avec les anciennes clés CLOTHING et SHOES sont relus sous leur catégorie.
 */
export const sizeGuidesSchema = z.preprocess(
  (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).map(([key, guide]) => [LEGACY_GUIDE_KEYS[key] ?? key, guide]))
      : value,
  z
    .record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60), sizeGuideSchema)
    .refine((guides) => Object.keys(guides).length <= 30, { error: '30 guides au plus' }),
);

// ───────────── Réglages propres au type de boutique ─────────────

const policyText = z.string().trim().max(400).default('');

/** Mode : échange d'une taille qui ne va pas. */
export const sizeExchangeSchema = z.object({
  enabled: z.boolean(),
  days: z.number().int().min(1).max(90),
  conditions: policyText,
});

/** Mode : commandes sur mesure (délai de confection, acompte, mesures demandées au client). */
export const madeToMeasureSchema = z.object({
  enabled: z.boolean(),
  leadTimeDays: z.number().int().min(1).max(120),
  depositPercent: z.number().int().min(0).max(100),
  measurements: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
});

/** Mode : le site se range par rayon (Femme, Homme, Enfant), d'après l'attribut « Rayon » des produits. */
export const departmentsSchema = z.object({ enabled: z.boolean() });

/** Tech : garantie proposée par défaut sur les appareils. */
export const warrantySettingsSchema = z.object({
  defaultMonths: z.number().int().min(0).max(60),
  terms: policyText,
});

/** Tech : un état proposé (Neuf, Reconditionné…) et son explication affichée sur le site. */
export const conditionSettingSchema = z.object({
  value: z.string().trim().min(1).max(40),
  description: z.string().trim().max(200).default(''),
  enabled: z.boolean().default(true),
});
export type ConditionSetting = z.infer<typeof conditionSettingSchema>;

/** Tech : reprise de l'ancien appareil, proposée sur les fiches des appareils. */
export const tradeInSchema = z.object({
  enabled: z.boolean(),
  text: z.string().trim().max(300).default(''),
});

/** Tech : IMEI ou numéro de série noté à l'expédition de chaque appareil. */
export const serialNumbersSchema = z.object({ enabled: z.boolean() });

/** Tech : retours et service après-vente. */
export const returnsSchema = z.object({
  enabled: z.boolean(),
  days: z.number().int().min(1).max(90),
  conditions: policyText,
  afterSalesContact: z.string().trim().max(120).default(''),
});

/** Réglages propres au type de boutique : chaque clé ne s'applique qu'à son type (Mode ou Tech). */
export const verticalSettingsSchema = z.object({
  // Mode
  sizeGuides: sizeGuidesSchema.optional(),
  sizeExchange: sizeExchangeSchema.optional(),
  madeToMeasure: madeToMeasureSchema.optional(),
  departments: departmentsSchema.optional(),
  // Tech
  warranty: warrantySettingsSchema.optional(),
  conditions: z.array(conditionSettingSchema).min(1).max(8).optional(),
  tradeIn: tradeInSchema.optional(),
  serialNumbers: serialNumbersSchema.optional(),
  returns: returnsSchema.optional(),
});
export type VerticalSettings = z.infer<typeof verticalSettingsSchema>;

/** Mesures demandées par défaut pour une commande sur mesure. */
export const DEFAULT_MEASUREMENTS = [
  'Tour de poitrine',
  'Tour de taille',
  'Tour de hanches',
  'Largeur d’épaules',
  'Longueur de manche',
  'Longueur totale',
];

/** Valeurs de départ des réglages, quand la boutique ne les a pas encore touchés. */
export const DEFAULT_VERTICAL_SETTINGS = {
  sizeExchange: { enabled: false, days: 7, conditions: 'Article non porté, étiquettes attachées.' },
  madeToMeasure: { enabled: false, leadTimeDays: 10, depositPercent: 50, measurements: DEFAULT_MEASUREMENTS },
  departments: { enabled: false },
  warranty: { defaultMonths: 12, terms: '' },
  conditions: Object.entries(CONDITION_HINTS).map(([value, description]) => ({
    value,
    description,
    enabled: value !== 'Occasion',
  })),
  tradeIn: { enabled: false, text: 'Apportez votre ancien téléphone : nous le reprenons en déduction du prix.' },
  serialNumbers: { enabled: false },
  returns: { enabled: false, days: 7, conditions: 'Appareil complet, dans sa boîte, sans dommage.', afterSalesContact: '' },
} satisfies Required<Omit<VerticalSettings, 'sizeGuides'>>;

/** États proposés par la boutique (réglage Tech), sinon ceux par défaut. */
export function conditionsFor(settings: VerticalSettings | null | undefined): ConditionSetting[] {
  return (settings?.conditions ?? DEFAULT_VERTICAL_SETTINGS.conditions).filter((c) => c.enabled);
}

/** Explication d'un état : celle de la boutique, sinon celle par défaut. */
export function conditionDescription(settings: VerticalSettings | null | undefined, value: string): string | undefined {
  const own = settings?.conditions?.find((c) => c.value === value)?.description;
  return own || CONDITION_HINTS[value];
}

/** Guides proposés par Upsell pour les catégories du modèle Mode, tant que la boutique n'a pas les siens. */
export const DEFAULT_SIZE_GUIDES: Record<string, SizeGuide> = {
  vetements: {
    title: 'Vêtements',
    columns: ['Taille', 'Tour de poitrine (cm)', 'Tour de taille (cm)', 'Tour de hanches (cm)'],
    rows: [
      ['XS', '78–82', '62–66', '86–90'],
      ['S', '82–88', '66–72', '90–96'],
      ['M', '88–96', '72–80', '96–104'],
      ['L', '96–104', '80–88', '104–112'],
      ['XL', '104–112', '88–96', '112–120'],
      ['XXL', '112–120', '96–106', '120–128'],
      ['3XL', '120–130', '106–116', '128–138'],
    ],
    note: 'Mesurez-vous sans serrer ; entre deux tailles, prenez la plus grande.',
  },
  chaussures: {
    title: 'Pointures',
    columns: ['EU', 'UK', 'US', 'Longueur du pied (cm)'],
    rows: [
      ['36', '3,5', '5', '23'],
      ['37', '4', '6', '23,7'],
      ['38', '5', '7', '24,3'],
      ['39', '6', '7,5', '25'],
      ['40', '6,5', '8', '25,7'],
      ['41', '7,5', '9', '26,3'],
      ['42', '8', '9,5', '27'],
      ['43', '9', '10', '27,7'],
      ['44', '9,5', '11', '28,3'],
      ['45', '10,5', '12', '29'],
      ['46', '11', '12,5', '29,7'],
    ],
    note: 'Mesurez votre pied du talon au bout du plus long orteil, en fin de journée.',
  },
};

/**
 * Guide des tailles d'un produit : celui de sa catégorie, sinon du parent le plus proche qui en a un
 * (celui de la boutique d'abord, puis celui par défaut). `path` va de la racine à la catégorie.
 */
export function sizeGuideFor(path: readonly string[], settings: VerticalSettings | null | undefined): SizeGuide | null {
  for (const slug of [...path].reverse()) {
    const guide = settings?.sizeGuides?.[slug] ?? DEFAULT_SIZE_GUIDES[slug];
    if (guide) return guide;
  }
  return null;
}

// ───────────── Services affichés sur le site ─────────────

/** Ce que le site montre des réglages de la boutique : seulement ce qui est activé et propre à son type. */
export interface StorefrontServicesDto {
  sizeExchange: { days: number; conditions: string } | null;
  madeToMeasure: { leadTimeDays: number; depositPercent: number; measurements: string[] } | null;
  /** Rayons (Femme, Homme, Enfant…) qui ont des produits en vente ; vide si le réglage est coupé. */
  departments: { value: string; label: string }[];
  warranty: { defaultMonths: number; terms: string } | null;
  conditions: { value: string; description: string }[];
  tradeIn: { text: string } | null;
  returns: { days: number; conditions: string; afterSalesContact: string } | null;
  /** L'IMEI ou le numéro de série de l'appareil est noté sur la commande. */
  serialNumbers: boolean;
}

export function storefrontServices(
  type: StoreType,
  settings: VerticalSettings | null | undefined,
  departmentsWithProducts: string[] = [],
): StorefrontServicesDto {
  const fashion = type === 'FASHION';
  const on = <T extends { enabled: boolean }>(value: T | undefined): T | null => (value?.enabled ? value : null);
  const exchange = fashion ? on(settings?.sizeExchange) : null;
  const measure = fashion ? on(settings?.madeToMeasure) : null;
  const tradeIn = fashion ? null : on(settings?.tradeIn);
  const returns = fashion ? null : on(settings?.returns);
  return {
    sizeExchange: exchange && { days: exchange.days, conditions: exchange.conditions },
    madeToMeasure: measure && {
      leadTimeDays: measure.leadTimeDays,
      depositPercent: measure.depositPercent,
      measurements: measure.measurements,
    },
    departments:
      fashion && settings?.departments?.enabled
        ? AUDIENCES.filter((a) => departmentsWithProducts.includes(a.value)).map((a) => ({ value: a.value, label: a.label }))
        : [],
    warranty: !fashion && settings?.warranty ? { defaultMonths: settings.warranty.defaultMonths, terms: settings.warranty.terms } : null,
    conditions: fashion ? [] : conditionsFor(settings).map((c) => ({ value: c.value, description: c.description || CONDITION_HINTS[c.value] || '' })),
    tradeIn: tradeIn && { text: tradeIn.text },
    returns: returns && { days: returns.days, conditions: returns.conditions, afterSalesContact: returns.afterSalesContact },
    serialNumbers: !fashion && Boolean(settings?.serialNumbers?.enabled),
  };
}
