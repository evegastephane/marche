import { z } from 'zod';

/**
 * Types de boutique (« verticales ») : chacun apporte ses sortes d'articles, ses options
 * préréglées (tailles, pointures, stockage…), sa fiche technique et ses filtres.
 * Ce registre est partagé par l'API (validation), le dashboard (formulaires) et les sites (affichage).
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

// ───────────── Options typées ─────────────

/** Nature d'une option de déclinaison : elle décide de son affichage (pastilles, grille, cartes). */
export const OPTION_TYPES = ['size', 'shoe_size', 'color', 'storage', 'memory', 'screen', 'condition', 'model', 'text'] as const;
export const optionTypeSchema = z.enum(OPTION_TYPES);
export type OptionType = z.infer<typeof optionTypeSchema>;

export const OPTION_TYPE_LABELS: Record<OptionType, string> = {
  size: 'Taille',
  shoe_size: 'Pointure',
  color: 'Couleur',
  storage: 'Stockage',
  memory: 'Mémoire vive',
  screen: 'Écran',
  condition: 'État',
  model: 'Modèle',
  text: 'Autre',
};

/** Couleur d'une pastille : #RRGGBB. */
export const swatchSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Couleur attendue au format #RRGGBB' });

/** Couleurs proposées d'emblée, avec leur pastille. */
export const COLOR_PRESETS: { value: string; hex: string }[] = [
  { value: 'Noir', hex: '#111111' },
  { value: 'Blanc', hex: '#F5F5F2' },
  { value: 'Gris', hex: '#8E8E93' },
  { value: 'Argent', hex: '#C7C7CC' },
  { value: 'Or', hex: '#D4AF37' },
  { value: 'Bleu', hex: '#1F5FAE' },
  { value: 'Bleu nuit', hex: '#1B2A4A' },
  { value: 'Rouge', hex: '#C8102E' },
  { value: 'Vert', hex: '#2E7D32' },
  { value: 'Violet', hex: '#6A4C93' },
  { value: 'Rose', hex: '#F4A7B9' },
  { value: 'Jaune', hex: '#F2C94C' },
  { value: 'Orange', hex: '#F66B21' },
  { value: 'Beige', hex: '#D8C3A5' },
  { value: 'Marron', hex: '#7B4B2A' },
  { value: 'Kaki', hex: '#6B6B3A' },
];

/** Valeurs prêtes à cocher, par nature d'option (l'ordre est celui d'affichage). */
export const OPTION_PRESETS: Partial<Record<OptionType, string[]>> = {
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  shoe_size: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
  color: COLOR_PRESETS.map((c) => c.value),
  storage: ['64 Go', '128 Go', '256 Go', '512 Go', '1 To'],
  memory: ['8 Go', '16 Go', '32 Go'],
  screen: ['11 pouces', '13 pouces', '14 pouces', '15 pouces', '16 pouces'],
  condition: ['Neuf', 'Reconditionné – Excellent', 'Reconditionné – Très bon', 'Reconditionné – Bon'],
};

/** Explication de l'état, affichée sous les cartes « État » du site. */
export const CONDITION_HINTS: Record<string, string> = {
  Neuf: 'Jamais utilisé, emballage d’origine.',
  'Reconditionné – Excellent': 'Comme neuf : aucune trace visible, testé et garanti.',
  'Reconditionné – Très bon': 'Micro-rayures à peine visibles, parfaitement fonctionnel.',
  'Reconditionné – Bon': 'Traces d’usage visibles, parfaitement fonctionnel. Le meilleur prix.',
};

// ───────────── Sortes d'articles ─────────────

export const FASHION_KINDS = ['CLOTHING', 'SHOES', 'FASHION_ACCESSORY'] as const;
export const ELECTRONICS_KINDS = ['PHONE', 'TABLET', 'COMPUTER', 'WATCH', 'ACCESSORY'] as const;
export const PRODUCT_KINDS = [...FASHION_KINDS, ...ELECTRONICS_KINDS] as const;
export const productKindSchema = z.enum(PRODUCT_KINDS);
export type ProductKind = z.infer<typeof productKindSchema>;

export const KINDS_BY_STORE_TYPE: Record<StoreType, readonly ProductKind[]> = {
  FASHION: FASHION_KINDS,
  ELECTRONICS: ELECTRONICS_KINDS,
};

/** Appareils auxquels on peut proposer des accessoires et des packs. */
export const DEVICE_KINDS: readonly ProductKind[] = ['PHONE', 'TABLET', 'COMPUTER', 'WATCH'];

export interface OptionPreset {
  type: OptionType;
  name: string;
  /** Valeurs cochées d'avance à la création (sous-ensemble des préréglages). */
  defaults?: string[];
}

export interface KindDefinition {
  label: string;
  plural: string;
  /** Options proposées à la création d'un article de cette sorte. */
  options: OptionPreset[];
}

export const KINDS: Record<ProductKind, KindDefinition> = {
  CLOTHING: {
    label: 'Vêtement',
    plural: 'Vêtements',
    options: [
      { type: 'size', name: 'Taille', defaults: ['S', 'M', 'L', 'XL'] },
      { type: 'color', name: 'Couleur' },
    ],
  },
  SHOES: {
    label: 'Chaussures',
    plural: 'Chaussures',
    options: [
      { type: 'shoe_size', name: 'Pointure', defaults: ['39', '40', '41', '42', '43', '44'] },
      { type: 'color', name: 'Couleur' },
    ],
  },
  FASHION_ACCESSORY: { label: 'Accessoire de mode', plural: 'Accessoires', options: [{ type: 'color', name: 'Couleur' }] },
  PHONE: {
    label: 'Téléphone',
    plural: 'Téléphones',
    options: [
      { type: 'storage', name: 'Stockage', defaults: ['128 Go', '256 Go'] },
      { type: 'color', name: 'Couleur' },
      { type: 'condition', name: 'État', defaults: ['Neuf'] },
    ],
  },
  TABLET: {
    label: 'Tablette',
    plural: 'Tablettes',
    options: [
      { type: 'storage', name: 'Stockage', defaults: ['128 Go', '256 Go'] },
      { type: 'color', name: 'Couleur' },
      { type: 'condition', name: 'État', defaults: ['Neuf'] },
    ],
  },
  COMPUTER: {
    label: 'Ordinateur',
    plural: 'Ordinateurs',
    options: [
      { type: 'screen', name: 'Écran', defaults: ['13 pouces'] },
      { type: 'memory', name: 'Mémoire vive', defaults: ['8 Go', '16 Go'] },
      { type: 'storage', name: 'Stockage', defaults: ['256 Go', '512 Go'] },
      { type: 'color', name: 'Couleur' },
    ],
  },
  WATCH: {
    label: 'Montre connectée',
    plural: 'Montres',
    options: [
      { type: 'screen', name: 'Boîtier' },
      { type: 'color', name: 'Couleur' },
      { type: 'condition', name: 'État', defaults: ['Neuf'] },
    ],
  },
  ACCESSORY: { label: 'Accessoire', plural: 'Accessoires', options: [{ type: 'color', name: 'Couleur' }] },
};

// ───────────── Fiche technique (attributs) ─────────────

export type AttributeFieldType = 'text' | 'number' | 'boolean' | 'select' | 'tags';

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  unit?: string;
  placeholder?: string;
  hint?: string;
  /** Choix d'une liste (select) ou suggestions (tags). */
  choices?: { value: string; label: string }[];
  /** Proposé comme filtre sur le site. */
  filterable?: boolean;
}

const choice = (value: string, label = value) => ({ value, label });

export const AUDIENCES = [
  choice('FEMME', 'Femme'),
  choice('HOMME', 'Homme'),
  choice('ENFANT', 'Enfant'),
  choice('MIXTE', 'Mixte'),
];

export const ACCESSORY_TYPES = [
  choice('CHARGER', 'Chargeur'),
  choice('CABLE', 'Câble'),
  choice('EARPHONES', 'Écouteurs'),
  choice('HEADPHONES', 'Casque'),
  choice('SPEAKER', 'Enceinte'),
  choice('CASE', 'Coque'),
  choice('SCREEN_PROTECTOR', 'Protection d’écran'),
  choice('POWER_BANK', 'Batterie externe'),
  choice('OTHER', 'Autre'),
];

const CARE_SUGGESTIONS = [
  'Lavage en machine 30 °C',
  'Lavage à la main',
  'Nettoyage à sec',
  'Ne pas sécher en machine',
  'Repassage doux',
  'Ne pas blanchir',
].map((c) => choice(c));

const fashionFields: AttributeField[] = [
  { key: 'audience', label: 'Rayon', type: 'select', choices: AUDIENCES, filterable: true },
  { key: 'composition', label: 'Matière', type: 'text', placeholder: '100 % coton' },
  { key: 'care', label: 'Entretien', type: 'tags', choices: CARE_SUGGESTIONS },
  { key: 'origin', label: 'Origine', type: 'text', placeholder: 'Fabriqué au Sénégal' },
];

const deviceCore: AttributeField[] = [
  {
    key: 'model',
    label: 'Modèle',
    type: 'text',
    placeholder: 'iPhone 12',
    hint: 'Les accessoires compatibles avec ce modèle seront proposés avec l’appareil.',
  },
  { key: 'screenSize', label: 'Taille d’écran', type: 'number', unit: 'pouces', placeholder: '6,1' },
  { key: 'screenTech', label: 'Écran', type: 'text', placeholder: 'OLED Super Retina XDR' },
  { key: 'processor', label: 'Processeur', type: 'text', placeholder: 'A14 Bionic' },
  { key: 'ram', label: 'Mémoire vive', type: 'text', placeholder: '4 Go' },
];

const warranty: AttributeField = { key: 'warrantyMonths', label: 'Garantie', type: 'number', unit: 'mois', placeholder: '12' };
const inTheBox: AttributeField = {
  key: 'inTheBox',
  label: 'Dans la boîte',
  type: 'tags',
  choices: ['Câble USB-C', 'Chargeur', 'Écouteurs', 'Coque', 'Outil d’éjection SIM', 'Documentation'].map((c) => choice(c)),
};

export const KIND_ATTRIBUTES: Record<ProductKind, AttributeField[]> = {
  CLOTHING: fashionFields,
  SHOES: fashionFields,
  FASHION_ACCESSORY: fashionFields,
  PHONE: [
    ...deviceCore,
    { key: 'camera', label: 'Appareil photo', type: 'text', placeholder: 'Double 12 Mpx' },
    { key: 'battery', label: 'Batterie', type: 'text', placeholder: '2 815 mAh' },
    { key: 'os', label: 'Système', type: 'text', placeholder: 'iOS 17' },
    { key: 'network5g', label: '5G', type: 'boolean' },
    { key: 'dualSim', label: 'Double SIM', type: 'boolean' },
    warranty,
    inTheBox,
  ],
  TABLET: [
    ...deviceCore,
    { key: 'battery', label: 'Autonomie', type: 'text', placeholder: '10 heures' },
    { key: 'os', label: 'Système', type: 'text', placeholder: 'iPadOS 17' },
    { key: 'cellular', label: 'Cellulaire (SIM)', type: 'boolean' },
    warranty,
    inTheBox,
  ],
  COMPUTER: [
    ...deviceCore,
    { key: 'graphics', label: 'Carte graphique', type: 'text', placeholder: 'Intégrée' },
    { key: 'battery', label: 'Autonomie', type: 'text', placeholder: '18 heures' },
    { key: 'os', label: 'Système', type: 'text', placeholder: 'macOS, Windows 11…' },
    { key: 'ports', label: 'Connectique', type: 'tags', choices: ['USB-C', 'USB-A', 'HDMI', 'Jack 3,5 mm', 'Lecteur SD'].map((c) => choice(c)) },
    warranty,
    inTheBox,
  ],
  WATCH: [
    { key: 'model', label: 'Modèle', type: 'text', placeholder: 'Apple Watch Series 9' },
    { key: 'compatibility', label: 'Compatible avec', type: 'tags', choices: ['iPhone', 'Android'].map((c) => choice(c)) },
    { key: 'battery', label: 'Autonomie', type: 'text', placeholder: '18 heures' },
    { key: 'waterResistance', label: 'Étanchéité', type: 'text', placeholder: '50 m' },
    warranty,
    inTheBox,
  ],
  ACCESSORY: [
    { key: 'accessoryType', label: 'Type d’accessoire', type: 'select', choices: ACCESSORY_TYPES, filterable: true },
    {
      key: 'compatibleModels',
      label: 'Compatible avec',
      type: 'tags',
      hint: 'Modèles d’appareils (ex. iPhone 12) : l’accessoire sera proposé sur leur fiche.',
    },
    {
      key: 'connector',
      label: 'Connectique',
      type: 'select',
      choices: ['USB-C', 'Lightning', 'Micro-USB', 'Jack 3,5 mm', 'Bluetooth', 'MagSafe', 'Autre'].map((c) => choice(c)),
    },
    { key: 'power', label: 'Puissance', type: 'number', unit: 'W', placeholder: '20' },
    { key: 'wireless', label: 'Sans fil', type: 'boolean' },
    warranty,
  ],
};

/** Valeur d'un attribut : texte, nombre, oui/non, ou liste de textes. */
export const attributeValueSchema = z.union([
  z.string().trim().max(200),
  z.number().finite().min(0).max(1_000_000),
  z.boolean(),
  z.array(z.string().trim().min(1).max(80)).max(30),
]);
export const productAttributesSchema = z.record(z.string().max(40), attributeValueSchema);
export type ProductAttributes = z.infer<typeof productAttributesSchema>;

/**
 * Nettoie et valide les attributs d'une sorte d'article : clés inconnues retirées,
 * type de chaque valeur vérifié, valeurs vides supprimées. Retourne les erreurs par clé.
 */
export function parseAttributes(
  kind: ProductKind,
  input: ProductAttributes,
): { attributes: ProductAttributes; errors: Record<string, string> } {
  const attributes: ProductAttributes = {};
  const errors: Record<string, string> = {};
  for (const field of KIND_ATTRIBUTES[kind]) {
    const value = input[field.key];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') errors[field.key] = 'Texte attendu';
        else attributes[field.key] = value.trim();
        break;
      case 'number':
        if (typeof value !== 'number') errors[field.key] = 'Nombre attendu';
        else attributes[field.key] = value;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') errors[field.key] = 'Oui ou non attendu';
        else attributes[field.key] = value;
        break;
      case 'select':
        if (typeof value !== 'string' || !field.choices?.some((c) => c.value === value)) errors[field.key] = 'Choix inconnu';
        else attributes[field.key] = value;
        break;
      case 'tags':
        if (!Array.isArray(value)) errors[field.key] = 'Liste attendue';
        else attributes[field.key] = [...new Set(value.map((v) => v.trim()).filter(Boolean))];
        break;
    }
  }
  return { attributes, errors };
}

/** Libellé lisible d'un attribut (choix d'une liste, oui/non, unité). */
export function formatAttribute(field: AttributeField, value: ProductAttributes[string]): string {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ');
  if (field.type === 'select') return field.choices?.find((c) => c.value === value)?.label ?? String(value);
  const text = typeof value === 'number' ? new Intl.NumberFormat('fr-FR').format(value) : value;
  return field.unit ? `${text} ${field.unit}` : text;
}

/** Normalise un nom de modèle pour la compatibilité : « iPhone 12 » = « iphone  12 ». */
export function modelKey(model: string): string {
  return model.normalize('NFKD').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
}

// ───────────── Guides des tailles ─────────────

export const sizeGuideSchema = z.object({
  title: z.string().trim().min(1).max(80),
  columns: z.array(z.string().trim().min(1).max(40)).min(2).max(8),
  rows: z.array(z.array(z.string().trim().max(40)).min(2).max(8)).min(1).max(30),
  note: z.string().trim().max(300).optional(),
});
export type SizeGuide = z.infer<typeof sizeGuideSchema>;

/** Réglages propres au type de boutique (guides des tailles pour la mode). */
export const verticalSettingsSchema = z.object({
  sizeGuides: z
    .object({
      CLOTHING: sizeGuideSchema.optional(),
      SHOES: sizeGuideSchema.optional(),
    })
    .optional(),
});
export type VerticalSettings = z.infer<typeof verticalSettingsSchema>;

export const DEFAULT_SIZE_GUIDES: { CLOTHING: SizeGuide; SHOES: SizeGuide } = {
  CLOTHING: {
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
  SHOES: {
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

/** Guide des tailles d'une sorte d'article (celui de la boutique, sinon celui par défaut). */
export function sizeGuideFor(kind: ProductKind | null, settings: VerticalSettings | null | undefined): SizeGuide | null {
  if (kind === 'CLOTHING') return settings?.sizeGuides?.CLOTHING ?? DEFAULT_SIZE_GUIDES.CLOTHING;
  if (kind === 'SHOES') return settings?.sizeGuides?.SHOES ?? DEFAULT_SIZE_GUIDES.SHOES;
  return null;
}

// ───────────── Aides d'affichage ─────────────

/** Pastille d'une couleur : celle choisie par la boutique, sinon celle du nuancier. */
export function swatchFor(option: { swatches?: Record<string, string> }, value: string): string | null {
  return option.swatches?.[value] ?? COLOR_PRESETS.find((c) => c.value.toLowerCase() === value.toLowerCase())?.hex ?? null;
}

/** Attributs proposés comme filtres sur le site (rayon, type d'accessoire…), sans doublon. */
export const FILTERABLE_ATTRIBUTES: AttributeField[] = [
  ...new Map(
    Object.values(KIND_ATTRIBUTES)
      .flat()
      .filter((field) => field.filterable)
      .map((field) => [field.key, field] as const),
  ).values(),
];
