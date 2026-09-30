import { describe, expect, it } from 'vitest';
import {
  categoryDescendants,
  categoryPath,
  categoryTracksUnits,
  combinationKey,
  dedupeSku,
  generateCombinations,
  modelCode,
  publishProblems,
  resolveCategoryAttributes,
  slugify,
  suggestSku,
  type TaxonomyAttribute,
  type TaxonomyCategory,
  type TaxonomyLink,
  validateSpecs,
  validateVariantOptions,
  valueCode,
  valueKey,
  variantTitle,
} from './catalog-model.js';

describe('valueCode (segment de SKU d’une valeur)', () => {
  it.each([
    ['256 Go', '256'],
    ['1 To', '1T'],
    ['2 TB', '2T'],
    ['45 mm', '45'],
    ['1,5 m', '15M'],
    ['0,5 m', '05M'],
    ['Noir', 'NOI'],
    ['Bleu nuit', 'BLN'],
    ['Titane désert', 'TID'],
    ['USB-C', 'USC'],
    ['16', '16'],
    ['iPhone 17 Pro', 'IP17P'],
  ])('%s → %s', (value, code) => {
    expect(valueCode(value)).toBe(code);
  });

  it('ne produit que des lettres majuscules et des chiffres, 8 au plus', () => {
    for (const value of ['Reconditionné – Très bon', 'Lavage en machine 30 °C', '!!!', 'Édition collector limitée spéciale']) {
      expect(valueCode(value)).toMatch(/^[A-Z0-9]{1,8}$/);
    }
  });
});

describe('valueKey et slugify', () => {
  it('compare sans casse, accents ni espaces superflus', () => {
    expect(valueKey('  Écran  OLED ')).toBe(valueKey('ecran oled'));
  });

  it('fabrique des slugs d’URL', () => {
    expect(slugify('Taille écran')).toBe('taille-ecran');
    expect(slugify('Coques & pochettes')).toBe('coques-pochettes');
    expect(slugify('***')).toBe('element');
  });
});

// ───────────── Données de test : Audio › Casques, Smartphones ─────────────

const attr = (slug: string, type: TaxonomyAttribute['type'], extra: Partial<TaxonomyAttribute> = {}): TaxonomyAttribute => ({
  id: `a-${slug}`,
  slug,
  name: slug,
  type,
  unit: null,
  isVariantAxis: false,
  filterable: false,
  values: [],
  ...extra,
});
const values = (...list: [string, string][]) => list.map(([value, code]) => ({ value, code, swatch: null }));

const couleur = attr('couleur', 'SELECT', { isVariantAxis: true, values: values(['Noir', 'BLK'], ['Argent', 'SLV'], ['Bleu', 'BLU']) });
const stockage = attr('stockage', 'SELECT', { isVariantAxis: true, values: values(['256 Go', '256'], ['512 Go', '512'], ['1 To', '1T']) });
const ram = attr('ram', 'SELECT', { isVariantAxis: true, values: values(['12 Go', '12G']) });
const connectivite = attr('connectivite', 'MULTI_SELECT', { values: values(['Bluetooth', 'BLU'], ['Wi-Fi', 'WIF']) });
const autonomie = attr('autonomie', 'NUMBER', { unit: 'h' });
const reduction = attr('reduction-bruit', 'BOOLEAN');
const type = attr('type', 'SELECT', { values: values(['Circum-auriculaire', 'CIR'], ['Intra-auriculaire', 'INT']) });
const processeur = attr('processeur', 'TEXT');
const ATTRIBUTES = [couleur, stockage, ram, connectivite, autonomie, reduction, type, processeur];

const CATEGORIES: TaxonomyCategory[] = [
  { id: 'root', parentId: null, name: 'Électronique', slug: 'electronique', tracksUnits: false },
  { id: 'audio', parentId: 'root', name: 'Audio', slug: 'audio', tracksUnits: false },
  { id: 'casques', parentId: 'audio', name: 'Casques', slug: 'casques', tracksUnits: false },
  { id: 'phones', parentId: 'root', name: 'Smartphones', slug: 'smartphones', tracksUnits: true },
  { id: 'used', parentId: 'phones', name: 'Occasions', slug: 'occasions', tracksUnits: false },
];

const LINKS: TaxonomyLink[] = [
  { categoryId: 'audio', attributeId: 'a-couleur', required: true, position: 0 },
  { categoryId: 'audio', attributeId: 'a-connectivite', required: false, position: 1 },
  { categoryId: 'audio', attributeId: 'a-autonomie', required: false, position: 2 },
  { categoryId: 'casques', attributeId: 'a-type', required: false, position: 0 },
  { categoryId: 'casques', attributeId: 'a-reduction-bruit', required: false, position: 1 },
  // Une sous-catégorie peut rendre facultatif un attribut obligatoire chez son parent.
  { categoryId: 'casques', attributeId: 'a-couleur', required: false, position: 2 },
  { categoryId: 'phones', attributeId: 'a-stockage', required: true, position: 0 },
  { categoryId: 'phones', attributeId: 'a-ram', required: true, position: 1 },
  { categoryId: 'phones', attributeId: 'a-couleur', required: true, position: 2 },
  { categoryId: 'phones', attributeId: 'a-processeur', required: true, position: 3 },
];

describe('héritage des attributs (règle 2)', () => {
  it('ajoute ceux des parents avant ceux de la catégorie', () => {
    const effective = resolveCategoryAttributes('casques', CATEGORIES, ATTRIBUTES, LINKS);
    expect(effective.map((a) => a.slug)).toEqual(['couleur', 'connectivite', 'autonomie', 'type', 'reduction-bruit']);
    expect(effective.find((a) => a.slug === 'connectivite')).toMatchObject({ inherited: true, sourceCategoryId: 'audio' });
    expect(effective.find((a) => a.slug === 'type')).toMatchObject({ inherited: false, sourceCategoryId: 'casques' });
  });

  it('prend le caractère obligatoire au plus près de la catégorie', () => {
    expect(resolveCategoryAttributes('audio', CATEGORIES, ATTRIBUTES, LINKS).find((a) => a.slug === 'couleur')?.required).toBe(true);
    expect(resolveCategoryAttributes('casques', CATEGORIES, ATTRIBUTES, LINKS).find((a) => a.slug === 'couleur')?.required).toBe(false);
  });

  it('une catégorie sans lien hérite de tout, une racine sans lien n’a rien', () => {
    expect(resolveCategoryAttributes('used', CATEGORIES, ATTRIBUTES, LINKS).map((a) => a.slug)).toEqual([
      'stockage',
      'ram',
      'couleur',
      'processeur',
    ]);
    expect(resolveCategoryAttributes('root', CATEGORIES, ATTRIBUTES, LINKS)).toEqual([]);
  });

  it('suit à l’unité les sous-catégories d’une catégorie suivie', () => {
    expect(categoryTracksUnits('used', CATEGORIES)).toBe(true);
    expect(categoryTracksUnits('casques', CATEGORIES)).toBe(false);
  });

  it('filtre un rayon entier : la catégorie et toutes ses sous-catégories', () => {
    expect(categoryDescendants('audio', CATEGORIES).sort()).toEqual(['audio', 'casques']);
    expect(categoryDescendants('root', CATEGORIES)).toHaveLength(CATEGORIES.length);
    expect(categoryDescendants('casques', CATEGORIES)).toEqual(['casques']);
  });

  it('refuse une catégorie inconnue ou un cycle', () => {
    expect(() => categoryPath('nope', CATEGORIES)).toThrow(/inconnue/);
    const cyclic: TaxonomyCategory[] = [
      { id: 'a', parentId: 'b', name: 'A', slug: 'a', tracksUnits: false },
      { id: 'b', parentId: 'a', name: 'B', slug: 'b', tracksUnits: false },
    ];
    expect(() => categoryPath('a', cyclic)).toThrow(/Cycle/);
  });
});

describe('génération des variantes (règle 4)', () => {
  it('produit cartésien des valeurs cochées', () => {
    const combos = generateCombinations([
      { slug: 'stockage', values: ['256 Go', '512 Go', '1 To'] },
      { slug: 'couleur', values: ['Noir', 'Argent'] },
    ]);
    expect(combos).toHaveLength(6);
    expect(combos[0]).toEqual({ stockage: '256 Go', couleur: 'Noir' });
    expect(combos).toContainEqual({ stockage: '1 To', couleur: 'Argent' });
  });

  it('sans axe coché : une seule variante par défaut (règle 3)', () => {
    expect(generateCombinations([])).toEqual([{}]);
    expect(generateCombinations([{ slug: 'couleur', values: [] }])).toEqual([{}]);
  });

  it('la clé d’une combinaison ne dépend ni de l’ordre ni de la casse', () => {
    expect(combinationKey({ stockage: '256 Go', couleur: 'Noir' })).toBe(combinationKey({ couleur: 'noir', stockage: '256 GO' }));
    expect(combinationKey({})).toBe('');
  });

  it('libellé dans l’ordre des axes', () => {
    expect(variantTitle({ couleur: 'Noir', stockage: '256 Go' }, ['stockage', 'couleur'])).toBe('256 Go / Noir');
    expect(variantTitle({})).toBe('Par défaut');
  });
});

describe('SKU (règle 5)', () => {
  const axes = [stockage, ram, couleur];

  it('{MODELE}-{STOCKAGE}-{COULEUR} avec les codes des valeurs', () => {
    expect(suggestSku('IP17P', { stockage: '256 Go', couleur: 'Noir' }, axes)).toBe('IP17P-256-BLK');
    expect(suggestSku('IP17P', { stockage: '1 To', ram: '12 Go', couleur: 'Argent' }, axes)).toBe('IP17P-1T-12G-SLV');
  });

  it('code calculé pour une valeur inconnue, référence par défaut', () => {
    expect(suggestSku('', { couleur: 'Vert sauge' }, axes)).toBe('ART-VES');
    expect(suggestSku('ip 17 pro', {}, axes)).toBe('IP17PRO');
  });

  it('code modèle proposé depuis le nom du produit', () => {
    expect(modelCode('iPhone 17 Pro')).toBe('IP17P');
    expect(modelCode('Apple Pencil Pro')).toBe('APPP');
  });

  it('dédoublonne un SKU déjà pris', () => {
    const taken = new Set(['IP17P-256-BLK', 'IP17P-256-BLK-2']);
    expect(dedupeSku('IP17P-256-BLK', (sku) => taken.has(sku))).toBe('IP17P-256-BLK-3');
    expect(dedupeSku('LIBRE', (sku) => taken.has(sku))).toBe('LIBRE');
  });
});

describe('fiche technique et publication (règle 10)', () => {
  const casques = resolveCategoryAttributes('casques', CATEGORIES, ATTRIBUTES, LINKS);

  it('valide chaque type, ramène les listes à leur libellé et retire l’inconnu', () => {
    const { specs, errors } = validateSpecs(casques, {
      connectivite: ['bluetooth', 'Bluetooth'],
      autonomie: 30,
      'reduction-bruit': true,
      type: 'circum-AURICULAIRE',
      couleur: 'Noir', // axe : jamais dans la fiche technique
      inconnu: 'x',
    });
    expect(errors).toEqual({});
    expect(specs).toEqual({ connectivite: ['Bluetooth'], autonomie: 30, 'reduction-bruit': true, type: 'Circum-auriculaire' });
  });

  it('signale les valeurs du mauvais type ou hors liste', () => {
    const { errors } = validateSpecs(casques, { autonomie: '30 h', type: 'Sans fil', connectivite: ['5G'], 'reduction-bruit': 'oui' });
    expect(Object.keys(errors).sort()).toEqual(['autonomie', 'connectivite', 'reduction-bruit', 'type']);
  });

  it('valide les valeurs d’axes d’une variante', () => {
    const phones = resolveCategoryAttributes('phones', CATEGORIES, ATTRIBUTES, LINKS);
    expect(validateVariantOptions(phones, { stockage: '256 go', couleur: 'noir' })).toEqual({ options: { stockage: '256 Go', couleur: 'Noir' } });
    expect(validateVariantOptions(phones, { processeur: 'A19' })).toHaveProperty('error');
    expect(validateVariantOptions(phones, { couleur: 'Fuchsia' })).toHaveProperty('error');
  });

  it('bloque la publication tant qu’un attribut obligatoire est vide', () => {
    const phones = resolveCategoryAttributes('phones', CATEGORIES, ATTRIBUTES, LINKS);
    const incomplete = publishProblems(phones, {
      specs: {},
      variants: [{ options: { stockage: '256 Go', couleur: 'Noir' } }],
    });
    expect(incomplete.map((p) => p.slug)).toEqual(['ram', 'processeur']);
    const complete = publishProblems(phones, {
      specs: { processeur: 'A19 Pro' },
      variants: [{ options: { stockage: '256 Go', ram: '12 Go', couleur: 'Noir' } }],
    });
    expect(complete).toEqual([]);
  });
});
