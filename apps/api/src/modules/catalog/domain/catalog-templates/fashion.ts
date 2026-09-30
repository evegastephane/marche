import type { CatalogTemplate, TemplateValue } from './catalog-template.js';

/** Boutique « Mode » : vêtements, chaussures et accessoires ; axes Taille, Pointure et Couleur. */

const plainValues = (list: readonly string[]): TemplateValue[] => list.map((value) => ({ value }));

export const FASHION_COLORS: TemplateValue[] = [
  { value: 'Noir', code: 'NOI', swatch: '#111111' },
  { value: 'Blanc', code: 'BLA', swatch: '#F5F5F2' },
  { value: 'Gris', code: 'GRI', swatch: '#8E8E93' },
  { value: 'Argent', code: 'ARG', swatch: '#C7C7CC' },
  { value: 'Or', code: 'OR', swatch: '#D4AF37' },
  { value: 'Bleu', code: 'BLE', swatch: '#1F5FAE' },
  { value: 'Bleu nuit', code: 'BLN', swatch: '#1B2A4A' },
  { value: 'Rouge', code: 'ROU', swatch: '#C8102E' },
  { value: 'Vert', code: 'VER', swatch: '#2E7D32' },
  { value: 'Violet', code: 'VIO', swatch: '#6A4C93' },
  { value: 'Rose', code: 'ROS', swatch: '#F4A7B9' },
  { value: 'Jaune', code: 'JAU', swatch: '#F2C94C' },
  { value: 'Orange', code: 'ORA', swatch: '#F66B21' },
  { value: 'Beige', code: 'BEI', swatch: '#D8C3A5' },
  { value: 'Marron', code: 'MAR', swatch: '#7B4B2A' },
  { value: 'Kaki', code: 'KAK', swatch: '#6B6B3A' },
];

export const AUDIENCE_VALUES: TemplateValue[] = plainValues(['Femme', 'Homme', 'Enfant', 'Mixte']);

export const FASHION_TEMPLATE: CatalogTemplate = {
  attributes: [
    {
      slug: 'taille',
      name: 'Taille',
      type: 'SELECT',
      isVariantAxis: true,
      filterable: true,
      values: plainValues(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']),
    },
    {
      slug: 'pointure',
      name: 'Pointure',
      type: 'SELECT',
      isVariantAxis: true,
      filterable: true,
      values: plainValues(['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47']),
    },
    { slug: 'couleur', name: 'Couleur', type: 'SELECT', isVariantAxis: true, filterable: true, values: FASHION_COLORS },
    { slug: 'rayon', name: 'Rayon', type: 'SELECT', filterable: true, values: AUDIENCE_VALUES },
    { slug: 'matiere', name: 'Matière', type: 'TEXT' },
    {
      slug: 'entretien',
      name: 'Entretien',
      type: 'MULTI_SELECT',
      values: plainValues([
        'Lavage en machine 30 °C',
        'Lavage à la main',
        'Nettoyage à sec',
        'Ne pas sécher en machine',
        'Repassage doux',
        'Ne pas blanchir',
      ]),
    },
    { slug: 'origine', name: 'Origine', type: 'TEXT' },
  ],
  categories: [
    {
      slug: 'vetements',
      name: 'Vêtements',
      attributes: [
        { slug: 'taille' },
        { slug: 'couleur' },
        { slug: 'rayon' },
        { slug: 'matiere' },
        { slug: 'entretien' },
        { slug: 'origine' },
      ],
    },
    {
      slug: 'chaussures',
      name: 'Chaussures',
      attributes: [{ slug: 'pointure' }, { slug: 'couleur' }, { slug: 'rayon' }, { slug: 'matiere' }, { slug: 'origine' }],
    },
    {
      slug: 'accessoires-mode',
      name: 'Accessoires',
      attributes: [{ slug: 'couleur' }, { slug: 'rayon' }, { slug: 'matiere' }, { slug: 'origine' }],
    },
    { slug: 'autres', name: 'Autres' },
  ],
};
