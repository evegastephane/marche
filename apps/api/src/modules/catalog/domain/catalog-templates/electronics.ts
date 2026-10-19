import type { CatalogTemplate, TemplateValue } from './catalog-template.js';

/**
 * Boutique « Électronique » (téléphones, audio, accessoires, gaming, informatique).
 * Axes de variante : Couleur, Stockage, RAM, SIM, Taille écran, Taille, Longueur, État. Le reste décrit le produit.
 * Un smartphone se choisit par stockage, couleur, état, SIM et taille d'écran (la RAM reste facultative).
 */

const values = (list: readonly (string | [string, string])[]): TemplateValue[] =>
  list.map((entry) => (typeof entry === 'string' ? { value: entry } : { value: entry[0], code: entry[1] }));

export const TECH_COLORS: TemplateValue[] = [
  { value: 'Noir', code: 'BLK', swatch: '#111111' },
  { value: 'Blanc', code: 'WHT', swatch: '#F5F5F2' },
  { value: 'Gris', code: 'GRY', swatch: '#8E8E93' },
  { value: 'Argent', code: 'SLV', swatch: '#C7C7CC' },
  { value: 'Or', code: 'GLD', swatch: '#D4AF37' },
  { value: 'Bleu', code: 'BLU', swatch: '#1F5FAE' },
  { value: 'Bleu nuit', code: 'NVY', swatch: '#1B2A4A' },
  { value: 'Rouge', code: 'RED', swatch: '#C8102E' },
  { value: 'Vert', code: 'GRN', swatch: '#2E7D32' },
  { value: 'Violet', code: 'PRP', swatch: '#6A4C93' },
  { value: 'Rose', code: 'PNK', swatch: '#F4A7B9' },
  { value: 'Jaune', code: 'YLW', swatch: '#F2C94C' },
  { value: 'Orange', code: 'ORG', swatch: '#F66B21' },
  { value: 'Titane naturel', code: 'TNA', swatch: '#BEB8AE' },
  { value: 'Titane noir', code: 'TBK', swatch: '#3C3C3D' },
  { value: 'Titane blanc', code: 'TWH', swatch: '#E6E4DF' },
  { value: 'Titane désert', code: 'TDS', swatch: '#C4AB93' },
  { value: 'Graphite', code: 'GPH', swatch: '#4A4A4C' },
  { value: 'Minuit', code: 'MID', swatch: '#232A35' },
  { value: 'Lumière stellaire', code: 'STL', swatch: '#F0E9DD' },
];

/** Cartes SIM (axe) : Double SIM couvre deux puces comme puce + eSIM. */
export const SIM_VALUES: TemplateValue[] = [
  { value: 'Nano-SIM', code: 'NANO' },
  { value: 'Double SIM', code: 'DUAL' },
  { value: 'eSIM', code: 'ESIM' },
];

/** Tailles d'écran courantes (axe) : téléphones, tablettes, ordinateurs. Le commerçant en ajoute d'autres. */
export const SCREEN_SIZES: TemplateValue[] = values([
  '5,4 pouces', '6,1 pouces', '6,3 pouces', '6,4 pouces', '6,5 pouces', '6,6 pouces', '6,7 pouces', '6,8 pouces', '6,9 pouces',
  '8,3 pouces', '10,9 pouces', '11 pouces', '12,9 pouces', '13 pouces',
  '13,3 pouces', '13,6 pouces', '14 pouces', '15,3 pouces', '16 pouces',
]);

/** États proposés (axe) : le prix d'un appareil dépend de son état. */
export const CONDITION_VALUES: TemplateValue[] = [
  { value: 'Neuf', code: 'NEW' },
  // Déballé, jamais utilisé : vendu moins cher qu'un neuf, sans l'usure d'un reconditionné.
  { value: 'Open box', code: 'OBX' },
  { value: 'Reconditionné – Excellent', code: 'RFA' },
  { value: 'Reconditionné – Très bon', code: 'RFB' },
  { value: 'Reconditionné – Bon', code: 'RFC' },
  { value: 'Occasion', code: 'USED' },
];

export const ELECTRONICS_TEMPLATE: CatalogTemplate = {
  attributes: [
    // ── Axes de variante
    { slug: 'couleur', name: 'Couleur', type: 'SELECT', isVariantAxis: true, filterable: true, values: TECH_COLORS },
    {
      slug: 'stockage',
      name: 'Stockage',
      type: 'SELECT',
      unit: 'Go',
      isVariantAxis: true,
      filterable: true,
      values: values(['32 Go', '64 Go', '128 Go', '256 Go', '512 Go', '1 To', '2 To']),
    },
    {
      slug: 'ram',
      name: 'RAM',
      type: 'SELECT',
      unit: 'Go',
      isVariantAxis: true,
      filterable: true,
      values: values([
        ['4 Go', '4G'],
        ['6 Go', '6G'],
        ['8 Go', '8G'],
        ['12 Go', '12G'],
        ['16 Go', '16G'],
        ['24 Go', '24G'],
        ['32 Go', '32G'],
        ['64 Go', '64G'],
      ]),
    },
    {
      slug: 'taille',
      name: 'Taille',
      type: 'SELECT',
      unit: 'mm',
      isVariantAxis: true,
      filterable: true,
      values: values(['40 mm', '41 mm', '42 mm', '44 mm', '45 mm', '46 mm', '49 mm']),
    },
    {
      slug: 'longueur',
      name: 'Longueur',
      type: 'SELECT',
      unit: 'm',
      isVariantAxis: true,
      filterable: true,
      values: values(['0,5 m', '1 m', '1,5 m', '2 m', '3 m']),
    },
    { slug: 'etat', name: 'État', type: 'SELECT', isVariantAxis: true, filterable: true, values: CONDITION_VALUES },
    { slug: 'sim', name: 'SIM', type: 'SELECT', isVariantAxis: true, filterable: true, values: SIM_VALUES },
    {
      slug: 'taille-ecran',
      name: 'Taille écran',
      type: 'SELECT',
      unit: 'pouces',
      isVariantAxis: true,
      filterable: true,
      values: SCREEN_SIZES,
    },
    // ── Fiche technique
    { slug: 'reseau', name: 'Réseau', type: 'SELECT', filterable: true, values: values(['4G', '5G']) },
    {
      slug: 'connectivite',
      name: 'Connectivité',
      type: 'MULTI_SELECT',
      filterable: true,
      values: values(['Bluetooth', 'Wi-Fi', 'Cellulaire', 'NFC', 'Filaire']),
    },
    {
      slug: 'type-connecteur',
      name: 'Type de connecteur',
      type: 'SELECT',
      filterable: true,
      values: values([
        'USB-C',
        'Lightning',
        'Micro-USB',
        'USB-A',
        'MagSafe',
        ['Jack 3,5 mm', 'JACK'],
        ['Sans fil (Qi)', 'QI'],
      ]),
    },
    { slug: 'puissance', name: 'Puissance', type: 'NUMBER', unit: 'W' },
    { slug: 'capacite', name: 'Capacité', type: 'NUMBER', unit: 'mAh' },
    { slug: 'autonomie', name: 'Autonomie', type: 'NUMBER', unit: 'h' },
    { slug: 'nombre-ports', name: 'Nombre de ports', type: 'NUMBER', unit: 'ports' },
    { slug: 'reduction-bruit', name: 'Réduction de bruit', type: 'BOOLEAN', filterable: true },
    { slug: 'charge-rapide', name: 'Charge rapide', type: 'BOOLEAN' },
    {
      slug: 'compatibilite',
      name: 'Compatibilité',
      type: 'MULTI_SELECT',
      filterable: true,
      values: values([
        'iPhone 17',
        'iPhone 17 Pro',
        'iPhone 17 Pro Max',
        'iPhone Air',
        'iPhone 16',
        'iPhone 16 Pro',
        'iPhone 16 Pro Max',
        'iPhone 15',
        'iPhone 15 Pro',
        'iPhone 15 Pro Max',
        'iPad Pro',
        'iPad Air',
        'iPad',
        'Apple Watch',
        'Galaxy S25',
        'Galaxy S25 Ultra',
        'Galaxy A56',
        'PS5',
        'Android',
      ]),
    },
    {
      slug: 'type',
      name: 'Type',
      type: 'SELECT',
      filterable: true,
      values: values(['Circum-auriculaire', 'Supra-auriculaire', 'Intra-auriculaire', 'Tour de cou']),
    },
    {
      slug: 'bracelet',
      name: 'Bracelet',
      type: 'SELECT',
      values: values(['Sport', 'Boucle Sport', 'Milanais', 'Cuir', 'Titane', 'Nylon tissé']),
    },
    { slug: 'gps', name: 'GPS', type: 'BOOLEAN' },
    { slug: 'processeur', name: 'Processeur', type: 'TEXT' },
    {
      slug: 'edition',
      name: 'Édition',
      type: 'SELECT',
      filterable: true,
      values: values(['Standard', 'Digital', 'Slim', 'Pro', 'Deluxe', 'Collector']),
    },
    { slug: 'editeur', name: 'Éditeur', type: 'TEXT' },
    {
      slug: 'genre',
      name: 'Genre',
      type: 'SELECT',
      filterable: true,
      values: values(['Action', 'Aventure', 'Sport', 'Course', 'Combat', 'RPG', 'Tir', 'Simulation', 'Famille']),
    },
    { slug: 'pegi', name: 'PEGI', type: 'SELECT', values: values(['3', '7', '12', '16', '18']) },
    { slug: 'langue', name: 'Langue', type: 'SELECT', values: values(['Français', 'Anglais', 'Multilingue']) },
    { slug: 'disposition', name: 'Disposition', type: 'SELECT', values: values(['AZERTY', 'QWERTY']) },
  ],
  categories: [
    {
      slug: 'electronique',
      name: 'Électronique',
      children: [
        {
          slug: 'smartphones',
          name: 'Smartphones',
          tracksUnits: true,
          attributes: [
            { slug: 'stockage', required: true },
            { slug: 'couleur', required: true },
            { slug: 'etat' },
            { slug: 'sim' },
            { slug: 'taille-ecran' },
            { slug: 'ram' },
            { slug: 'reseau' },
          ],
        },
        {
          slug: 'tablettes',
          name: 'Tablettes',
          tracksUnits: true,
          attributes: [
            { slug: 'stockage', required: true },
            { slug: 'couleur', required: true },
            { slug: 'etat' },
            { slug: 'taille-ecran' },
            { slug: 'connectivite' },
          ],
        },
        {
          slug: 'ordinateurs',
          name: 'Ordinateurs',
          tracksUnits: true,
          attributes: [
            { slug: 'ram', required: true },
            { slug: 'stockage', required: true },
            { slug: 'couleur' },
            { slug: 'etat' },
            { slug: 'processeur' },
            { slug: 'taille-ecran' },
            { slug: 'autonomie' },
          ],
        },
        {
          slug: 'montres-connectees',
          name: 'Montres connectées',
          tracksUnits: true,
          attributes: [
            { slug: 'taille', required: true },
            { slug: 'couleur', required: true },
            { slug: 'etat' },
            { slug: 'bracelet' },
            { slug: 'connectivite' },
            { slug: 'gps' },
          ],
        },
        {
          slug: 'audio',
          name: 'Audio',
          attributes: [{ slug: 'couleur', required: true }, { slug: 'connectivite' }, { slug: 'autonomie' }],
          children: [
            { slug: 'casques', name: 'Casques', attributes: [{ slug: 'type' }, { slug: 'reduction-bruit' }] },
            { slug: 'ecouteurs', name: 'Écouteurs', attributes: [{ slug: 'type' }, { slug: 'reduction-bruit' }] },
            { slug: 'enceintes', name: 'Enceintes', attributes: [{ slug: 'puissance' }] },
          ],
        },
        {
          slug: 'accessoires',
          name: 'Accessoires',
          attributes: [{ slug: 'compatibilite' }],
          children: [
            {
              slug: 'chargeurs',
              name: 'Chargeurs',
              attributes: [
                { slug: 'puissance', required: true },
                { slug: 'type-connecteur', required: true },
                { slug: 'nombre-ports' },
              ],
            },
            {
              slug: 'cables',
              name: 'Câbles',
              attributes: [
                { slug: 'type-connecteur', required: true },
                { slug: 'longueur', required: true },
                { slug: 'puissance' },
                { slug: 'couleur', required: true },
              ],
            },
            {
              slug: 'batteries-externes',
              name: 'Batteries externes',
              attributes: [
                { slug: 'capacite', required: true },
                { slug: 'puissance' },
                { slug: 'nombre-ports' },
                { slug: 'charge-rapide' },
                { slug: 'couleur', required: true },
              ],
            },
            { slug: 'coques-pochettes', name: 'Coques et pochettes', attributes: [{ slug: 'couleur', required: true }] },
            { slug: 'sacs', name: 'Sacs', attributes: [{ slug: 'couleur' }] },
            { slug: 'apple-pencil', name: 'Apple Pencil' },
            { slug: 'smart-tag', name: 'Smart Tag' },
          ],
        },
        {
          slug: 'gaming',
          name: 'Gaming',
          children: [
            {
              slug: 'ps5',
              name: 'PS5',
              tracksUnits: true,
              attributes: [{ slug: 'edition', required: true }, { slug: 'stockage', required: true }, { slug: 'etat' }],
            },
            {
              slug: 'jeux',
              name: 'Jeux',
              attributes: [{ slug: 'editeur' }, { slug: 'genre' }, { slug: 'pegi' }, { slug: 'langue' }, { slug: 'edition' }],
            },
            { slug: 'manettes', name: 'Manettes', attributes: [{ slug: 'couleur', required: true }, { slug: 'compatibilite' }] },
          ],
        },
        {
          slug: 'informatique',
          name: 'Informatique',
          attributes: [{ slug: 'connectivite' }],
          children: [
            { slug: 'souris', name: 'Souris', attributes: [{ slug: 'couleur' }] },
            { slug: 'claviers', name: 'Claviers', attributes: [{ slug: 'couleur' }, { slug: 'disposition' }] },
            { slug: 'autres-peripheriques', name: 'Autres périphériques', attributes: [{ slug: 'compatibilite' }] },
          ],
        },
        { slug: 'autres', name: 'Autres' },
      ],
    },
  ],
};
